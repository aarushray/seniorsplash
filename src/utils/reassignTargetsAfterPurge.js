import { collection, getDocs, doc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { firestore } from '../firebase/config';

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export const reassignTargetsAfterPurge = async () => {
  console.log('Starting target reassignment after purge...');
  
  const alivePlayersQuery = query(
    collection(firestore, 'players'),
    where('isAlive', '==', true),
    where('isInGame', '==', true)
  );
  const alivePlayersSnap = await getDocs(alivePlayersQuery);
  let alivePlayers = [];
  alivePlayersSnap.forEach((docSnap) => {
    alivePlayers.push({ id: docSnap.id, ...docSnap.data() });
  });

  if (alivePlayers.length < 2) {
    // If only one player is left, they are the winner
    if (alivePlayers.length === 1) {
      const gameRef = doc(firestore, 'game', 'state');
      await updateDoc(gameRef, {
        gameOver: true,
        winner: alivePlayers[0].id,
      });
      await updateDoc(doc(firestore, 'players', alivePlayers[0].id), {
        targetId: null,
      });
    }
    return;
  }

  // Group players by class
  const playersByClass = {};
  alivePlayers.forEach(player => {
    const playerClass = player.studentClass || 'Unknown';
    if (!playersByClass[playerClass]) {
      playersByClass[playerClass] = [];
    }
    playersByClass[playerClass].push(player);
  });

  const classes = Object.keys(playersByClass);
  console.log('Classes found:', classes);
  
  // If only one class remains, nobody gets targets (game should end)
  if (classes.length === 1) {
    const batch = writeBatch(firestore);
    
    alivePlayers.forEach(player => {
      const playerRef = doc(firestore, 'players', player.id);
      batch.update(playerRef, {  // ✅ Use batch.update
        targetId: null,
        targetAssignedAt: new Date()
      });
    });
    
    await batch.commit();  // ✅ Use batch.commit
    return;
  }

  // Create assignments following the rules
  const assignments = [];
  const targetAssignmentCount = {}; // Track how many assassins each target has
  
  // Initialize target count tracking
  alivePlayers.forEach(player => {
    targetAssignmentCount[player.id] = 0;
  });

  // Process each class
  for (const assassinClass of classes) {
    const assassins = playersByClass[assassinClass];
    console.log(`Processing ${assassinClass}: ${assassins.length} assassins`);
    
    // Get potential targets (alive players from OTHER classes)
    const potentialTargets = alivePlayers.filter(player => 
      player.studentClass !== assassinClass
    );
    
    if (potentialTargets.length === 0) {
      console.log(`No valid targets for class ${assassinClass}`);
      continue;
    }

    // Assign targets to each assassin in this class
    for (const assassin of assassins) {
      // Find the best target for this assassin
      let bestTarget = null;
      
      // First, try to find targets with no assassins yet
      const targetsWithNoAssassins = potentialTargets.filter(target => 
        targetAssignmentCount[target.id] === 0 && 
        !wouldCreateMutualTargeting(assassin, target, assignments)
      );
      
      if (targetsWithNoAssassins.length > 0) {
        // Prefer targets with no assassins
        shuffleArray(targetsWithNoAssassins);
        bestTarget = targetsWithNoAssassins[0];
      } else {
        // If no unassigned targets, find target with fewest assassins (avoiding mutual targeting)
        const validTargets = potentialTargets.filter(target => 
          !wouldCreateMutualTargeting(assassin, target, assignments)
        );
        
        if (validTargets.length > 0) {
          // Sort by assignment count (fewest first)
          validTargets.sort((a, b) => 
            targetAssignmentCount[a.id] - targetAssignmentCount[b.id]
          );
          bestTarget = validTargets[0];
        } else {
          // Last resort: assign to any target from other classes
          shuffleArray(potentialTargets);
          bestTarget = potentialTargets[0];
          console.warn(`Forced assignment for ${assassin.fullName} - mutual targeting may occur`);
        }
      }
      
      if (bestTarget) {
        assignments.push({
          assassin: assassin,
          target: bestTarget
        });
        targetAssignmentCount[bestTarget.id]++;
        
        console.log(`${assassin.fullName} (${assassin.studentClass}) → ${bestTarget.fullName} (${bestTarget.studentClass})`);
      } else {
        console.error(`Could not find target for ${assassin.fullName}`);
      }
    }
  }

  // Execute the assignments
  const batch = writeBatch(firestore);
  for (const assignment of assignments) {
    const playerRef = doc(firestore, 'players', assignment.assassin.id);
    
  batch.update(playerRef, {  // ✅ CORRECT: batch.update
      targetId: assignment.target.id,
      targetAssignedAt: new Date()
    });
  }

  // Execute all updates
  await batch.commit();  
  // Log assignment summary
  classes.forEach(className => {
    const classSize = playersByClass[className].length;
    console.log(`${className}: ${classSize} players`);
  });
  
  
  // Log targets with multiple assassins
  const multipleAssassins = Object.entries(targetAssignmentCount)
    .filter(([_, count]) => count > 1)
    .map(([targetId, count]) => {
      const target = alivePlayers.find(p => p.id === targetId);
      return { target: target?.fullName || targetId, count };
    });
    
};

// Helper function to check if an assignment would create mutual targeting (A→B, B→A)
function wouldCreateMutualTargeting(assassin, potentialTarget, existingAssignments) {
  // Check if potentialTarget already targets assassin
  const existingAssignment = existingAssignments.find(assignment => 
    assignment.assassin.id === potentialTarget.id && 
    assignment.target.id === assassin.id
  );
  
  return existingAssignment !== undefined;
}