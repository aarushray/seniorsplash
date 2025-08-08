import { collection, getDoc, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { firestore } from '../firebase/config';

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Helper function to check if an assignment would create mutual targeting (A→B, B→A)
function wouldCreateMutualTargeting(assassin, potentialTarget, existingAssignments) {
  // Check if potentialTarget already targets assassin
  const existingAssignment = existingAssignments.find(assignment => 
    assignment.assassin.id === potentialTarget.id && 
    assignment.target.id === assassin.id
  );
  
  return existingAssignment !== undefined;
}

/**
 * Assigns targets to students across different classes with optimal distribution
 * @param {Array} classes - Array of class names
 * @param {Object} playersByClass - Object mapping class names to arrays of students
 * @returns {Array} Array of assignment objects {assassin, target}
 */
function assignTargetsOptimally(classes, playersByClass) {
  // Create flat lists for easier processing
  const allStudents = [];
  const studentToClass = {};
  
  classes.forEach(className => {
    playersByClass[className].forEach(student => {
      allStudents.push(student);
      studentToClass[student.id] = className;
    });
  });

  // Track assignment counts for each target
  const targetAssignmentCount = {};
  allStudents.forEach(student => {
    targetAssignmentCount[student.id] = 0;
  });

  const assignments = [];

  // Shuffle students for fair random ordering
  shuffleArray(allStudents);

  // Assign targets to each student
  allStudents.forEach(assassin => {
    const assassinClass = studentToClass[assassin.id];
    
    // Get all potential targets (students from different classes)
    const potentialTargets = allStudents.filter(target => 
      studentToClass[target.id] !== assassinClass
    );

    if (potentialTargets.length === 0) {
      console.warn(`No valid targets for ${assassin.fullName || assassin.id} from class ${assassinClass}`);
      return;
    }

    // Filter out targets that would create mutual assignments
    const validTargets = potentialTargets.filter(target => 
      !wouldCreateMutualTargeting(assassin, target, assignments)
    );

    // If no valid targets due to mutual targeting restrictions, use all potential targets
    const targetsToConsider = validTargets.length > 0 ? validTargets : potentialTargets;

    // Find the minimum assignment count among valid targets
    const minAssignments = Math.min(...targetsToConsider.map(target => 
      targetAssignmentCount[target.id]
    ));

    // Get all targets with the minimum assignment count
    const leastAssignedTargets = targetsToConsider.filter(target => 
      targetAssignmentCount[target.id] === minAssignments
    );

    // Randomly select from the least assigned targets for fairness
    shuffleArray(leastAssignedTargets);
    const selectedTarget = leastAssignedTargets[0];

    // Make the assignment
    assignments.push({
      assassin: assassin,
      target: selectedTarget
    });

    // Update assignment count
    targetAssignmentCount[selectedTarget.id]++;

    console.log(`${assassin.fullName || assassin.id} (${assassinClass}) → ${selectedTarget.fullName || selectedTarget.id} (${studentToClass[selectedTarget.id]}) [Count: ${targetAssignmentCount[selectedTarget.id]}]`);
  });

  return { assignments, targetAssignmentCount };
}

const assignTargets = async () => {
  console.log('Starting optimal target assignment...');
  
  const gameRef = doc(firestore, 'game', 'state');
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists() || !gameSnap.data().gameStarted) {
    throw new Error('Game has not started yet. No targets can be assigned.');
  }

  // Only get alive players who are in the game
  const playersQuery = query(
    collection(firestore, 'players'),
    where('isAlive', '==', true),
    where('isInGame', '==', true)
  );
  const querySnapshot = await getDocs(playersQuery);
  const players = [];
  querySnapshot.forEach((docSnap) => {
    players.push({ id: docSnap.id, ...docSnap.data() });
  });

  if (players.length < 2) {
    throw new Error('Not enough alive players in the game to start. Need at least 2 players.');
  }

  // Group players by class
  const playersByClass = players.reduce((acc, player) => {
    const { studentClass } = player;
    if (!acc[studentClass]) {
      acc[studentClass] = [];
    }
    acc[studentClass].push(player);
    return acc;
  }, {});

  const classes = Object.keys(playersByClass);
  console.log('Classes found:', classes);
  
  // If only one class exists, nobody gets targets (game cannot proceed)
  if (classes.length === 1) {
    console.log('Only one class found - cannot assign cross-class targets');
    throw new Error('Cannot start game with only one class. Players must be from different classes to target each other.');
  }

  console.log(`Found ${players.length} alive players in the game across ${classes.length} classes`);

  // Use the optimal assignment algorithm
  const { assignments, targetAssignmentCount } = assignTargetsOptimally(classes, playersByClass);

  // Execute the assignments
  const batch = [];
  for (const assignment of assignments) {
    const playerRef = doc(firestore, 'players', assignment.assassin.id);
    
    batch.push(updateDoc(playerRef, {
      targetId: assignment.target.id,
      targetAssignedAt: new Date()
    }));
  }

  // Execute all updates
  try {
    await Promise.all(batch);
    console.log('All target assignments completed successfully');
  } catch (error) {
    console.error('Error executing target assignments:', error);
    throw new Error('Failed to assign targets to players');
  }
  
  // Log assignment summary
  console.log('Optimal target assignment completed:');
  classes.forEach(className => {
    const classSize = playersByClass[className].length;
    console.log(`${className}: ${classSize} players`);
  });
  
  // Calculate and log distribution statistics
  const assignmentCounts = Object.values(targetAssignmentCount);
  const maxAssignments = Math.max(...assignmentCounts);
  const minAssignments = Math.min(...assignmentCounts);
  const avgAssignments = assignmentCounts.reduce((sum, count) => sum + count, 0) / assignmentCounts.length;
  
  console.log('Assignment distribution:');
  console.log(`  Min assignments per target: ${minAssignments}`);
  console.log(`  Max assignments per target: ${maxAssignments}`);
  console.log(`  Average assignments per target: ${avgAssignments.toFixed(2)}`);
  console.log(`  Distribution spread: ${maxAssignments - minAssignments}`);
  
  // Log targets with multiple assassins
  const multipleAssassins = Object.entries(targetAssignmentCount)
    .filter(([_, count]) => count > 1)
    .map(([targetId, count]) => {
      const target = players.find(p => p.id === targetId);
      return { target: target?.fullName || targetId, count };
    })
    .sort((a, b) => b.count - a.count); // Sort by count descending
    
  if (multipleAssassins.length > 0) {
    console.log('Targets with multiple assassins:');
    multipleAssassins.forEach(({ target, count }) => {
      console.log(`  ${target}: ${count} assassins`);
    });
  }
  
  console.log(`Total assignments made: ${assignments.length}`);
  console.log(`Total players: ${players.length}`);
};

export default assignTargets;