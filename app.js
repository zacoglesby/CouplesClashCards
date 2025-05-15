// Global Game State
const gameState = {
  players: [],     // Will hold player objects
  couples: [],     // Array of [playerId, partnerId]
  deck: [],        // Will load from cards.json
  discardPile: [],
  currentPlayerIndex: 0,
  pointThreshold: 10,  // Default, can be 10, 15, 20, 30
  currentCard: null,
  selectedCardTypes: ['Heart', 'Mind', 'Soul', 'Ego', 'ActOut', 'Penalty', 'Wildcard'] // Add this line
};

let timerInterval;

function startTimer(seconds, onTimeUp) {
  const timerDisplay = document.getElementById('timer-display');
  const timerCountdown = document.getElementById('timer-countdown');
  timerDisplay.style.display = 'block';

  let timeLeft = seconds;
  timerCountdown.textContent = timeLeft;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerCountdown.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerDisplay.style.display = 'none';
      onTimeUp(); 
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  document.getElementById('timer-display').style.display = 'none';
}

async function loadDeck() {
  try {
    const response = await fetch('./cards.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Create a deep copy of the cards to avoid reference issues
    gameState.deck = JSON.parse(JSON.stringify(data));
    shuffleDeck(gameState.deck);
    console.log("Deck loaded with", gameState.deck.length, "cards");
    return true;
  } catch (error) {
    console.error("Error loading deck:", error);
    return false;
  }
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

window.onload = async function() {
  await loadDeck();
  setupEventListeners();
  // Make sure setupCardTypeSelections is called after DOM is fully loaded
  setTimeout(setupCardTypeSelections, 100);
};

function setupEventListeners() {
  const startBtn = document.getElementById('start-btn');
  const startGameBtn = document.getElementById('start-game-btn');
  const drawCardBtn = document.getElementById('draw-card-btn');
  const restartBtn = document.getElementById('restart-btn');
  const playerCountSelect = document.getElementById('player-count');
  const coupleCountSelect = document.getElementById('couple-count');
  const completeBtn = document.getElementById('complete-btn');
  const incompleteBtn = document.getElementById('incomplete-btn');
  const mainPageBtn = document.getElementById('main-page-btn');
  const setupMainPageBtn = document.getElementById('setup-main-page-btn');

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      document.getElementById('intro-screen').style.display = 'none';
      document.getElementById('setup-page').style.display = 'block';
    });
  }

  if (startGameBtn) {
    startGameBtn.addEventListener('click', async () => {
      // Ensure deck is loaded before starting game
      if (gameState.deck.length === 0) {
        await loadDeck();
      }
      if (gameState.deck.length === 0) {
        alert('Error loading cards. Please try again.');
        return;
      }
      setupPlayers();
      document.getElementById('setup-page').style.display = 'none';
      document.getElementById('gameplay-page').style.display = 'block';
      renderScoreboard();
    });
  }

  if (drawCardBtn) {
    // Replace the event listener to ensure it's properly attached
    drawCardBtn.addEventListener('click', function() {
      console.log("Draw card button clicked");
      drawCard();
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', restartGame);
  }

  if (playerCountSelect) {
    playerCountSelect.addEventListener('change', generatePlayerInputs);
  }

  if (coupleCountSelect) {
    coupleCountSelect.addEventListener('change', generateCouplePairings);
  }

  if (completeBtn) {
    completeBtn.addEventListener('click', () => handleCardCompletion(true));
  }
  if (incompleteBtn) {
    incompleteBtn.addEventListener('click', () => handleCardCompletion(false));
  }
  if (mainPageBtn) {
    mainPageBtn.addEventListener('click', confirmMainPageReturn);
  }
  
  if (setupMainPageBtn) {
    setupMainPageBtn.addEventListener('click', () => {
      document.getElementById('setup-page').style.display = 'none';
      document.getElementById('intro-screen').style.display = 'block';
    });
  }
}

function handleCardCompletion(isComplete) {
  const currentCard = gameState.currentCard;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  if (!currentCard || !currentPlayer) {
    console.error("Cannot complete card: missing card or player data");
    return;
  }

  console.log(`Card completion: ${isComplete ? 'Complete' : 'Incomplete'} for ${currentPlayer.name}`);
  
  if (isComplete) {
    updateScore(currentPlayer.id, currentCard.points);
  } else {
    updateScore(currentPlayer.id, -Math.abs(currentCard.points));
  }
  
  document.querySelector('.action-buttons').style.display = 'none';
  nextPlayer();
}

// Add the missing updateScore function
function updateScore(playerId, points) {
  const player = gameState.players.find(p => p.id === playerId);
  if (player) {
    console.log(`Updating score for ${player.name}: ${player.score} → ${player.score + points}`);
    player.score += points;
    renderScoreboard();
    highlightScore(playerId);
    playSound('assets/score-up.mp3');
    
    // Check for winner
    if (player.score >= gameState.pointThreshold) {
      endGame(player);
    }
  } else {
    console.error(`Player with ID ${playerId} not found`);
  }
}

function confirmMainPageReturn() {
  if (confirm('Are you sure you want to return to the main page? Current game progress will be lost.')) {
    document.getElementById('gameplay-page').style.display = 'none';
    document.getElementById('setup-page').style.display = 'block';
  }
}

function generatePlayerInputs() {
  const count = parseInt(document.getElementById('player-count').value);
  const container = document.getElementById('player-inputs');
  container.innerHTML = '';
  
  for (let i = 1; i <= count; i++) {
    container.innerHTML += `
      <div class="player-input">
        <input type="text" id="player${i}-name" placeholder="Player ${i} Name">
      </div>
    `;
  }
  
  // Add input listeners to new player name fields
  document.querySelectorAll('[id^="player"][id$="-name"]').forEach(input => {
    input.addEventListener('input', updatePlayerSelections);
  });
}

function generateCouplePairings() {
  const count = parseInt(document.getElementById('couple-count').value);
  const container = document.getElementById('couple-pairings');
  container.innerHTML = '';
  
  for (let i = 1; i <= count; i++) {
    container.innerHTML += `
      <div class="couple-pairing">
        <label>Couple ${i}:</label>
        <select id="couple${i}-a" class="player-select"></select>
        <select id="couple${i}-b" class="player-select"></select>
      </div>
    `;
  }
  updatePlayerSelections();
}

function updatePlayerSelections() {
  const players = Array.from(document.querySelectorAll('[id^="player"][id$="-name"]'))
    .map(input => ({
      id: input.id.replace('-name', ''),
      name: input.value || input.placeholder
    }));
  
  const selects = document.querySelectorAll('.player-select');
  selects.forEach(select => {
    const currentValue = select.value; // Store current selection
    select.innerHTML = `
      <option value="">Select Player</option>
      ${players.map(p => `
        <option value="${p.id}" ${currentValue === p.id ? 'selected' : ''}>
          ${p.name}
        </option>
      `).join('')}
    `;
  });
}

function restartGame() {
  // Reset game state
  gameState.currentPlayerIndex = 0;
  gameState.players.forEach(player => player.score = 0);
  
  // Reset deck by moving all cards back and reshuffling
  gameState.deck = [...gameState.deck, ...gameState.discardPile];
  gameState.discardPile = [];
  shuffleDeck(gameState.deck);
  
  // Reset UI
  document.getElementById('end-game').style.display = 'none';
  document.getElementById('setup-page').style.display = 'block';
  document.getElementById('game-board').style.display = 'none';
  document.querySelector('.action-buttons').style.display = 'none';
  
  renderScoreboard();
}

function setupPlayers() {
  const playerInputs = document.querySelectorAll('[id^="player"][id$="-name"]');
  if (!playerInputs.length) {
    alert('Please enter player names first!');
    return;
  }

  const players = [];
  
  playerInputs.forEach((input, index) => {
    // Use the same id as the input field (e.g., player1, player2, ...)
    players.push({
      id: input.id.replace('-name', ''),
      name: input.value || `Player ${index + 1}`,
      partnerId: '',
      score: 0
    });
  });
  
  gameState.players = players;
  
  // Set up couples based on selections
  gameState.couples = [];
  const coupleCount = parseInt(document.getElementById('couple-count').value);
  for (let i = 1; i <= coupleCount; i++) {
    const player1Id = document.getElementById(`couple${i}-a`).value;
    const player2Id = document.getElementById(`couple${i}-b`).value;
    if (player1Id && player2Id) {
      gameState.couples.push([player1Id, player2Id]);
      // Set partner IDs
      const player1 = players.find(p => p.id === player1Id);
      const player2 = players.find(p => p.id === player2Id);
      if (player1 && player2) {
        player1.partnerId = player2Id;
        player2.partnerId = player1Id;
      }
    }
  }

  const thresholdSelect = document.getElementById('point-threshold');
  gameState.pointThreshold = parseInt(thresholdSelect.value);

  renderScoreboard(); // Initialize scoreboard after player setup
  updateCurrentPlayerDisplay(); // Add this line
  highlightCurrentPlayer(); // Highlight the initial current player
}

function nextPlayer() {
  gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  highlightCurrentPlayer();
  updateCurrentPlayerDisplay(); // Add this line
}

// Add this new function
function updateCurrentPlayerDisplay() {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const playerNameElement = document.getElementById('current-player-name');
  if (playerNameElement && currentPlayer) {
    playerNameElement.textContent = currentPlayer.name;
  }
}
function renderScoreboard() {
  const scoreList = document.getElementById('score-list');
  scoreList.innerHTML = ''; // Clear existing items

  // Find the player with the highest score
  const leadingPlayer = findLeadingPlayer();
  
  // Find the couple with highest combined score
  const leadingCouple = findLeadingCouple();

  // Group players by couples
  if (gameState.couples.length > 0) {
    // Display couples format
    gameState.couples.forEach((coupleIds, index) => {
      const player1 = gameState.players.find(p => p.id === coupleIds[0]);
      const player2 = gameState.players.find(p => p.id === coupleIds[1]);
      
      if (player1 && player2) {
        const coupleTotal = player1.score + player2.score;
        const coupleIndex = index + 1;
        
        // Create couple container
        const coupleContainer = document.createElement('div');
        coupleContainer.className = 'couple-container';
        
        // Create couple header
        const coupleHeader = document.createElement('div');
        coupleHeader.className = 'couple-header';
        coupleHeader.innerHTML = `<span>Couple ${coupleIndex}:</span>`;
        
        // Highlight leading couple
        if (leadingCouple && coupleIds[0] === leadingCouple[0][0] && coupleIds[1] === leadingCouple[0][1]) {
          coupleHeader.classList.add('leader-couple');
        }
        
        coupleContainer.appendChild(coupleHeader);
        
        // Create player entries
        [player1, player2].forEach(player => {
          const playerItem = document.createElement('li');
          playerItem.id = player.id;
          
          // Create name span
          const nameSpan = document.createElement('span');
          nameSpan.textContent = player.name;
          
          // Create score span
          const scoreSpan = document.createElement('span');
          scoreSpan.textContent = `${player.score} pts`;
          
          // Add elements to list item
          playerItem.appendChild(nameSpan);
          playerItem.appendChild(scoreSpan);
          
          // Highlight the leading player
          if (leadingPlayer && player.id === leadingPlayer.id) {
            playerItem.classList.add('leader');
          }
          
          // Highlight current player
          if (gameState.players[gameState.currentPlayerIndex].id === player.id) {
            playerItem.classList.add('active-player');
          }
          
          coupleContainer.appendChild(playerItem);
        });
        
        // Add couple total
        const coupleTotal_el = document.createElement('div');
        coupleTotal_el.className = 'couple-total';
        coupleTotal_el.innerHTML = `<span>Couple ${coupleIndex}: ${coupleTotal} pts total</span>`;
        coupleContainer.appendChild(coupleTotal_el);
        
        scoreList.appendChild(coupleContainer);
      }
    });
  } else {
    // Original individual player display for games without couples
    gameState.players.forEach(player => {
      const li = document.createElement('li');
      
      // Create name span
      const nameSpan = document.createElement('span');
      nameSpan.textContent = player.name;
      
      // Create score span
      const scoreSpan = document.createElement('span');
      scoreSpan.textContent = `${player.score} pts`;
      
      // Add elements to list item
      li.appendChild(nameSpan);
      li.appendChild(scoreSpan);
      
      li.id = player.id; // Set id for highlightScore to work
      
      // Highlight the leading player
      if (leadingPlayer && player.id === leadingPlayer.id) {
        li.classList.add('leader');
      }
      
      // Highlight current player
      if (gameState.players[gameState.currentPlayerIndex].id === player.id) {
        li.classList.add('active-player');
      }
      
      scoreList.appendChild(li);
    });
  }

  // Update points to win display
  const pointsToWin = document.getElementById('points-to-win');
  if (pointsToWin) {
    pointsToWin.textContent = gameState.pointThreshold;
  }
  
  // Update leader status
  updateLeaderStatus();
}

// Find the player with the highest score
function findLeadingPlayer() {
  if (gameState.players.length === 0) return null;
  
  let highestScore = Number.NEGATIVE_INFINITY;
  let leadingPlayer = null;
  
  for (const player of gameState.players) {
    if (player.score > highestScore) {
      highestScore = player.score;
      leadingPlayer = player;
    }
  }
  
  return highestScore > 0 ? leadingPlayer : null;
}

// Find the couple with the highest combined score
function findLeadingCouple() {
  if (gameState.couples.length === 0) return null;
  
  let highestScore = Number.NEGATIVE_INFINITY;
  let leadingCouple = null;
  
  for (const couple of gameState.couples) {
    const player1 = gameState.players.find(p => p.id === couple[0]);
    const player2 = gameState.players.find(p => p.id === couple[1]);
    
    if (player1 && player2) {
      const combinedScore = player1.score + player2.score;
      if (combinedScore > highestScore) {
        highestScore = combinedScore;
        leadingCouple = couple;
      }
    }
  }
  
  return highestScore > 0 ? [leadingCouple, highestScore] : null;
}

// Update the leader status text to include couple information
function updateLeaderStatus() {
  const leaderStatus = document.getElementById('leader-status');
  if (!leaderStatus) return;
  
  const leadingPlayer = findLeadingPlayer();
  const leadingCouple = findLeadingCouple();
  
  if (leadingCouple && leadingCouple[1] > 0) {
    // Find the couple number
    const coupleIndex = gameState.couples.findIndex(
      couple => couple[0] === leadingCouple[0][0] && couple[1] === leadingCouple[0][1]
    );
    
    if (coupleIndex !== -1) {
      const player1 = gameState.players.find(p => p.id === leadingCouple[0][0]);
      const player2 = gameState.players.find(p => p.id === leadingCouple[0][1]);
      
      leaderStatus.innerHTML = `<span class="leader-highlight">Couple ${coupleIndex + 1} (${player1.name} & ${player2.name})</span> is in the lead with ${leadingCouple[1]} points!`;
      return;
    }
  }
  
  // Fall back to individual leader if no couples or error finding couple info
  if (leadingPlayer && leadingPlayer.score > 0) {
    leaderStatus.innerHTML = `<span class="leader-highlight">${leadingPlayer.name}</span> is in the lead!`;
  } else if (gameState.players.length > 0) {
    leaderStatus.textContent = "Game just started!";
  } else {
    leaderStatus.textContent = "";
  }
}

// Modify highlightScore to work with the new scoreboard structure
function highlightScore(playerId) {
  const scoreElement = document.getElementById(playerId);
  if (!scoreElement) {
    console.warn(`Score element for player ID ${playerId} not found`);
    return;
  }
  
  scoreElement.classList.add('score-highlight');
  
  // If we have couples, also highlight the couple total
  if (gameState.couples.length > 0) {
    // Find which couple this player belongs to
    const couple = gameState.couples.find(couple => 
      couple[0] === playerId || couple[1] === playerId
    );
    
    if (couple) {
      // Find the couple container that holds this player
      const parentContainer = scoreElement.closest('.couple-container');
      if (parentContainer) {
        const coupleTotal = parentContainer.querySelector('.couple-total');
        if (coupleTotal) {
          coupleTotal.classList.add('score-highlight');
          
          // Remove the highlight after animation completes
          setTimeout(() => {
            coupleTotal.classList.remove('score-highlight');
          }, 1000);
        }
      }
    }
  }
  
  setTimeout(() => {
    scoreElement.classList.remove('score-highlight');
  }, 1000);
}

function spinForParticipant(excludeId) {
  const possiblePlayers = gameState.players.filter(p => p.id !== excludeId);
  const randomIndex = Math.floor(Math.random() * possiblePlayers.length);
  return possiblePlayers[randomIndex];
}

function showSpinnerModal(excludeId) {
  const spinnerModal = document.getElementById('spinner-modal');
  const spinnerResult = document.getElementById('spinner-result');

  spinnerResult.textContent = 'Spinning...';
  spinnerModal.style.display = 'block';

  return new Promise(resolve => {
    setTimeout(() => {
      const chosen = spinForParticipant(excludeId);
      spinnerResult.textContent = `Chosen: ${chosen.name}`;
      setTimeout(() => {
        spinnerModal.style.display = 'none';
        resolve(chosen);
      }, 2000);
    }, 2000);
  });
}

function handleActOutCard(card, currentPlayer) {
  if (card.requiresSpinner) {
    showSpinnerModal(currentPlayer.id).then(() => {
      updateScore(currentPlayer.id, card.points);
    });
  } else {
    updateScore(currentPlayer.id, card.points);
  }
  alert(`${currentPlayer.name} must perform an action!`);
}

function handlePenaltyCard(card, currentPlayer) {
  updateScore(currentPlayer.id, card.points);
  alert(`${currentPlayer.name} receives a penalty of ${card.points} points.`);
}

function handleWildcardCard(card, currentPlayer) {
  updateScore(currentPlayer.id, card.points);
  alert(`${currentPlayer.name} draws a Wildcard!`);
  // TODO: Implement special wildcard logic
}

function highlightCurrentPlayer() {
  const current = gameState.players[gameState.currentPlayerIndex];
  console.log("Current Turn:", current.name);
  
  // Update UI to show current player
  const scoreItems = document.querySelectorAll('#score-list li');
  scoreItems.forEach((item, index) => {
    item.classList.toggle('active-player', index === gameState.currentPlayerIndex);
  });
}

function drawCard() {
    console.log("Draw card function called");
    
    if (gameState.deck.length === 0) {
        if (gameState.discardPile.length === 0) {
            alert("No more cards in the deck!");
            return;
        }
        // When reshuffling, only include cards of selected types
        gameState.deck = gameState.discardPile.filter(card => 
            gameState.selectedCardTypes.includes(card.type)
        );
        gameState.discardPile = [];
        shuffleDeck(gameState.deck);
    }

    // Draw cards only of selected types
    let card;
    do {
        if (gameState.deck.length === 0) {
            alert("No valid cards remaining!");
            return;
        }
        card = gameState.deck.pop();
    } while (!gameState.selectedCardTypes.includes(card.type));

    gameState.currentCard = card;
    gameState.discardPile.push(card);
    
    console.log("Card drawn:", card);
    
    // Display the card using the new stack flip animation
    displayCardWithStackFlip(card);
    
    // Disable the draw button temporarily during animation
    const drawCardBtn = document.getElementById('draw-card-btn');
    if (drawCardBtn) {
        drawCardBtn.disabled = true;
    }
    
    // Show action buttons after card flip animation
    setTimeout(() => {
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            actionButtons.style.display = 'flex';
        }
        
        if (drawCardBtn) {
            drawCardBtn.disabled = false;
        }
    }, 900);
}

function displayCardWithStackFlip(card) {
    console.log("Displaying card with stack flip:", card);
    
    // Update the content in the stack-card-king (back of the flip)
    const stackCardType = document.querySelector('.stack-card-type');
    const stackCardText = document.querySelector('.stack-card-text');
    const stackCardDesc = document.querySelector('.stack-card-description');
    
    if (stackCardType) {
        stackCardType.textContent = `${card.type} Card`;
    } else {
        console.error("Card type element not found");
    }
    
    if (stackCardDesc) {
        stackCardDesc.textContent = card.categoryDescription || "";
    } else {
        console.error("Card description element not found");
    }
    
    if (stackCardText) {
        stackCardText.textContent = card.text;
    } else {
        console.error("Card text element not found");
    }
    
    // Trigger the card flip animation
    toggleStackFlip();
}

function toggleStackFlip() {
    console.log("Toggling stack flip");
    
    const flipcard = document.getElementById('flipcard');
    const hiddenCard = document.querySelector('.stack-card-g.hidden-card');
    
    if (!flipcard) {
        console.error("Flipcard element not found!");
        return;
    }
    
    if (flipcard.classList.contains('flip')) {
        // Reset the flip (hiding the card)
        flipcard.classList.remove('flip');
        flipcard.classList.add('hide');
        
        setTimeout(() => {
            flipcard.classList.remove('hide');
            if (hiddenCard) hiddenCard.style.display = 'block';
        }, 900);
    } else {
        // Perform the flip (showing the card)
        if (hiddenCard) hiddenCard.style.display = 'block';
        flipcard.classList.add('flip');
        playSound('assets/score-up.mp3'); // Optional: play a sound when flipping
    }
}

function playSound(soundPath) {
  const audio = new Audio(soundPath);
  audio.play().catch(err => console.log('Sound playback error:', err));
}

function endGame(winner) {
  stopTimer(); // Stop any running timer
  document.getElementById('gameplay-page').style.display = 'none'; // Updated to target the correct element
  document.getElementById('end-game').style.display = 'block';
  document.getElementById('winner-name').textContent = winner.name;
}
function setupCardTypeSelections() {
    const cardTypeCheckboxes = document.querySelectorAll('.card-type-option input[type="checkbox"]');
    
    if (cardTypeCheckboxes.length > 0) {
        // Initialize gameState.selectedCardTypes with checked values
        const checkedTypes = Array.from(cardTypeCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        // Only update if checkboxes exist and are selected, otherwise keep default
        if (checkedTypes.length > 0) {
            gameState.selectedCardTypes = checkedTypes;
        }
        
        // Ensure at least one card type is selected initially
        if (gameState.selectedCardTypes.length === 0) {
            const firstCheckbox = cardTypeCheckboxes[0];
            if (firstCheckbox) {
                firstCheckbox.checked = true;
                gameState.selectedCardTypes = [firstCheckbox.value];
            }
        }
    }

    cardTypeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // Update selectedCardTypes based on current checkbox states
            gameState.selectedCardTypes = Array.from(cardTypeCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);
            
            // Ensure at least one type is selected
            if (gameState.selectedCardTypes.length === 0) {
                alert("Please select at least one card type!");
                checkbox.checked = true;
                gameState.selectedCardTypes = [checkbox.value];
            }
            
            console.log('Selected card types:', gameState.selectedCardTypes);
            
            // Filter current deck to only include selected card types
            gameState.deck = gameState.deck.filter(card => 
                gameState.selectedCardTypes.includes(card.type)
            );
        });
    });
}

// Enhance button animations
function setupButtonAnimations() {
    const buttons = document.querySelectorAll('button, .img-button');
    
    buttons.forEach(button => {
        // Add ripple effect at click position
        button.addEventListener('mousedown', function(e) {
            const ripple = document.createElement('div');
            ripple.className = 'ripple-effect';
            ripple.style.width = '20px';
            ripple.style.height = '20px';
            ripple.style.borderRadius = '50%';
            ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
            ripple.style.position = 'absolute';
            ripple.style.transform = 'scale(0)';
            ripple.style.animation = 'ripple 0.6s linear';
            
            // Calculate click position relative to button
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            button.appendChild(ripple);
            
            // Remove ripple element after animation completes
            setTimeout(() => {
                button.removeChild(ripple);
            }, 600);
        });
    });
}

// Add ripple animation keyframes to the document
function addRippleAnimation() {
    if (!document.getElementById('ripple-animation')) {
        const style = document.createElement('style');
        style.id = 'ripple-animation';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Add this to your existing event listeners setup
document.addEventListener('DOMContentLoaded', function() {
    // ...existing DOMContentLoaded code...
    
    // Setup button animations
    addRippleAnimation();
    setupButtonAnimations();
});

// Also set up animations whenever the page changes
function setupNewElements() {
    // This can be called after dynamic elements are added
    setupButtonAnimations();
}

// Modify your existing setupEventListeners function to include animation setup
const originalSetupEventListeners = setupEventListeners;
setupEventListeners = function() {
    originalSetupEventListeners();
    setTimeout(setupButtonAnimations, 100); // Short delay to ensure all elements are ready
};

// Add this debugging function at the end of the file
function debug(message) {
    console.log(message);
    const debugStatus = document.getElementById('debug-status');
    if (debugStatus) {
        debugStatus.style.display = 'block';
        debugStatus.textContent = message;
        
        // Clear message after 5 seconds
        setTimeout(() => {
            debugStatus.style.display = 'none';
        }, 5000);
    }
}

// Add this code to test the button functionality when the game page is shown
document.addEventListener('DOMContentLoaded', function() {
    const drawCardBtn = document.getElementById('draw-card-btn');
    
    if (drawCardBtn) {
        // Add another event listener to test if the button is clickable
        drawCardBtn.addEventListener('click', function() {
            debug('Draw card button clicked!');
        });
        
        // Log that the button was found
        console.log('Draw card button found and event listener attached');
    } else {
        console.error('Draw card button not found on page load');
    }
    
    // Test if the button is accessible when the gameplay page is shown
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', function() {
            setTimeout(() => {
                const drawCardBtnAfterGameStart = document.getElementById('draw-card-btn');
                if (drawCardBtnAfterGameStart) {
                    console.log('Draw card button found after game start');
                    debug('Game started - Draw card button is ready');
                } else {
                    console.error('Draw card button not found after game start');
                }
            }, 500);
        });
    }
});

// Spin Wheel Implementation
let wheel;
let spinAudio = new Audio("assets/score-up.mp3"); // Reusing your existing sound
const spinDuration = 5000; // milliseconds
let selectedWheelPlayers = []; // Store players that are selected for the wheel

// Initialize the wheel with selected players - fixed to properly display player names
function initWheel() {
  // Check if wheel already exists and destroy it
  if (wheel) {
    wheel.destroy();
  }
  
  // Get the current player
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  // Get players selected for the wheel (excluding current player)
  selectedWheelPlayers = getSelectedWheelPlayers().filter(p => p.id !== currentPlayer.id);
  
  console.log("Players for wheel:", selectedWheelPlayers.length);
  console.log("Player names:", selectedWheelPlayers.map(p => p.name));
  
  // If no players selected, show message
  if (selectedWheelPlayers.length === 0) {
    document.getElementById("final-value").innerHTML = "<p>Please select players for the wheel!</p>";
    return;
  }
  
  // Get canvas element
  const canvas = document.getElementById("wheel");
  if (!canvas) {
    console.error("Canvas element not found");
    return;
  }
  
  // Segment colors - add more colors if needed
  const colors = [
    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", 
    "#FF9F40", "#8AC249", "#EA5F94", "#00D8B6", "#FFB7B2"
  ];
  
  // Calculate segment angles
  const segmentSize = 360 / selectedWheelPlayers.length;
  const rotationValues = [];
  
  // Set up rotation values for each player
  selectedWheelPlayers.forEach((player, index) => {
    rotationValues.push({
      minDegree: index * segmentSize,
      maxDegree: (index + 1) * segmentSize - 1, // -1 to avoid overlap
      value: index, // Index of the player in selectedWheelPlayers array
      player: player // Store the player object for reference
    });
  });
  
  // Get player names for wheel segments
  const playerNames = selectedWheelPlayers.map(player => player.name);
  console.log("Player names for wheel:", playerNames);
  
  // Chart configuration
  const chartConfig = {
    type: "pie",
    data: {
      labels: playerNames, // Use player names explicitly
      datasets: [{
        backgroundColor: colors.slice(0, selectedWheelPlayers.length),
        data: Array(selectedWheelPlayers.length).fill(1), // All segments same size
        borderWidth: 1,
        borderColor: "#ffffff",
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 0 },
      plugins: {
        tooltip: false,
        legend: {
          display: false,
        },
        datalabels: {
          color: "#ffffff",
          formatter: (_, context) => context.chart.data.labels[context.dataIndex],
          font: { 
            size: 16, // Increased font size for better visibility
            weight: 'bold' 
          },
          // Adjust label angle for better readability
          rotation: (context) => {
            const segmentMiddle = context.dataIndex * segmentSize + segmentSize / 2;
            return segmentMiddle > 90 && segmentMiddle < 270 ? 180 : 0;
          },
          textAlign: 'center',
          display: true // Ensure labels are displayed
        }
      }
    }
  };
  
  console.log("Creating wheel with config:", chartConfig);
  
  try {
    // Create the wheel chart with the ChartJS library
    wheel = new Chart(canvas, chartConfig);
    
    // Force an update to ensure labels are rendered
    wheel.update();
    
    // Log the data to verify
    console.log("Wheel created with segments:", wheel.data.labels.length);
    console.log("Segment labels:", wheel.data.labels);
    
    // Update final-value
    document.getElementById("final-value").innerHTML = "<p>Click On The Spin Button To Start</p>";
    
    // Add spin button event listener
    const spinBtn = document.getElementById("spin-btn");
    if (spinBtn) {
      // Remove existing event listeners to prevent duplicates
      const newSpinBtn = spinBtn.cloneNode(true);
      spinBtn.parentNode.replaceChild(newSpinBtn, spinBtn);
      
      // Add event listener to the new button
      newSpinBtn.addEventListener("click", function() {
        spinWheel(rotationValues, selectedWheelPlayers);
      });
    }
  } catch (error) {
    console.error("Error creating wheel:", error);
  }
}

// Get players that are selected for the wheel based on checkboxes
function getSelectedWheelPlayers() {
  const checkboxes = document.querySelectorAll('.wheel-player-item input[type="checkbox"]:checked');
  console.log("Found checked checkboxes:", checkboxes.length);
  
  // Map checkboxes to player objects, ensuring we get valid player references
  const checkedPlayers = Array.from(checkboxes).map(checkbox => {
    const playerId = checkbox.getAttribute('data-player-id');
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      console.warn(`Player with ID ${playerId} not found`);
    }
    return player;
  }).filter(player => player !== undefined);
  
  console.log("Valid selected players:", checkedPlayers.length);
  
  return checkedPlayers;
}

// Add function to handle spun player selection
function spinnedPlayerSelected(player) {
  if (!player) return;
  
  // Handle the selected player from the wheel spin
  console.log(`Wheel selected player: ${player.name}`);
  
  // Close wheel modal if open
  const wheelModal = document.getElementById('wheel-modal');
  if (wheelModal) {
    wheelModal.style.display = 'none';
  }
  
  // Update UI to show selected player
  document.getElementById('spinner-result').textContent = `Selected: ${player.name}`;
  
  // Handle any game logic related to the selected player
  if (gameState.currentCard) {
    // You can add specific actions based on the card type
    alert(`${player.name} has been selected for ${gameState.players[gameState.currentPlayerIndex].name}'s card!`);
  }
}

// Spin the wheel and select a player
function spinWheel(rotationValues, selectedPlayers) {
  // Ensure we have players to spin for
  if (selectedPlayers.length === 0) {
    document.getElementById("final-value").innerHTML = "<p>Please select players for the wheel!</p>";
    return;
  }

  const spinBtn = document.getElementById("spin-btn");
  const finalValue = document.getElementById("final-value");
  
  // Disable button during spin
  spinBtn.disabled = true;
  spinBtn.style.opacity = "0.7";
  
  // Reset final value
  finalValue.innerHTML = "<p>Spinning...</p>";
  
  // Generate random stop angle (between 0 and 360)
  const stopAngle = Math.floor(Math.random() * 360);
  
  // Calculate rotation
  let rotationInterval = window.setInterval(() => {
    wheel.options.rotation = wheel.options.rotation ? wheel.options.rotation + 10 : 10;
    wheel.update();
  }, 10);
  
  // Play spin sound
  spinAudio.play().catch(err => console.log("Audio play error:", err));
  
  // Stop the wheel after the spin duration
  setTimeout(() => {
    // Clear rotation interval
    clearInterval(rotationInterval);
    
    // Set the final rotation to the stop angle
    wheel.options.rotation = stopAngle;
    wheel.update();
    
    // Determine the selected player
    const selectedValue = findValueFromStopAngle(stopAngle, rotationValues);
    const selectedPlayer = selectedPlayers[selectedValue];
    
    // Display the result
    finalValue.innerHTML = `<p>Selected: <strong>${selectedPlayer.name}</strong></p>`;
    
    // Re-enable the button
    spinBtn.disabled = false;
    spinBtn.style.opacity = "1";
    
    // If this is for a card that requires spinning
    if (gameState.currentCard && gameState.currentCard.requiresSpinner) {
      spinnedPlayerSelected(selectedPlayer);
    }
  }, spinDuration);
}

// Find the value from the stop angle
function findValueFromStopAngle(stopAngle, rotationValues) {
  // Normalize the angle to be between 0-360
  const normalizedAngle = stopAngle % 360;
  
  // Find which segment the angle is in
  for (let i of rotationValues) {
    if (normalizedAngle >= i.minDegree && normalizedAngle <= i.maxDegree) {
      return i.value;
    }
  }
  
  // Fallback to first value
  return 0;
}

// Improved function to generate player checkboxes for the wheel
function generateWheelPlayerCheckboxes() {
  const wheelPlayerList = document.getElementById('wheel-player-list');
  if (!wheelPlayerList) {
    console.error("Wheel player list element not found");
    return;
  }
  
  wheelPlayerList.innerHTML = ''; // Clear existing checkboxes
  
  // Skip if no players
  if (!gameState.players || gameState.players.length === 0) {
    wheelPlayerList.innerHTML = '<p>No players available</p>';
    return;
  }
  
  console.log("Generating checkboxes for players:", gameState.players.length);
  
  // Create a checkbox for each player
  gameState.players.forEach(player => {
    const playerItem = document.createElement('div');
    playerItem.className = 'wheel-player-item selected'; // Start with selected class
    
    // Create checkbox - checked by default
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `wheel-player-${player.id}`;
    checkbox.setAttribute('data-player-id', player.id);
    checkbox.checked = true; // All players are included by default
    
    // Create label
    const label = document.createElement('label');
    label.htmlFor = `wheel-player-${player.id}`;
    label.textContent = player.name;
    
    // Add change event to update the wheel when selection changes
    checkbox.addEventListener('change', function() {
      // Toggle the selected class based on checkbox state
      if (this.checked) {
        playerItem.classList.add('selected');
      } else {
        playerItem.classList.remove('selected');
      }
      
      console.log(`Player ${player.name} checkbox changed: ${this.checked}`);
      
      // Ensure there's at least one player checked
      const anyChecked = document.querySelectorAll('.wheel-player-item input[type="checkbox"]:checked').length > 0;
      if (!anyChecked) {
        this.checked = true;
        playerItem.classList.add('selected');
        alert("At least one player must be selected for the wheel");
      }
      
      // Reinitialize the wheel with selected players - add a small delay
      setTimeout(initWheel, 50);
    });
    
    // Also make the entire item clickable
    playerItem.addEventListener('click', function(e) {
      // Don't trigger if clicking directly on the checkbox (would be handled by checkbox's own event)
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
        
        // Manually trigger the change event
        const changeEvent = new Event('change');
        checkbox.dispatchEvent(changeEvent);
      }
    });
    
    // Add elements to the container
    playerItem.appendChild(checkbox);
    playerItem.appendChild(label);
    wheelPlayerList.appendChild(playerItem);
  });
  
  console.log("Wheel player checkboxes generated:", gameState.players.length);
  
  // Initialize the wheel with all selected players - increased timeout for reliability
  setTimeout(initWheel, 300);
}

// Add this to setupPlayers to generate checkboxes and initialize the wheel
const originalSetupPlayers = setupPlayers;
// Modify setupPlayers to include wheel functionality
document.addEventListener('DOMContentLoaded', function() {
  // Store original function reference if it exists
  if (typeof setupPlayers === 'function') {
    const originalSetupPlayers = setupPlayers;
    
    // Override the function
    setupPlayers = function() {
      // Call the original function
      originalSetupPlayers();
      
      // Generate player checkboxes for the wheel - increased timeout for reliability
      setTimeout(() => {
        generateWheelPlayerCheckboxes();
        
        // Force a redraw of the wheel after setup
        setTimeout(() => {
          if (wheel) {
            wheel.update();
            console.log("Forced wheel update after player setup");
          }
        }, 600);
      }, 500);
    };
  }
});
function debugWheel() {
  if (!wheel) {
    console.error("Wheel not initialized");
    return;
  }
  
  console.log("Current wheel config:", wheel.config);
  console.log("Data labels:", wheel.data.labels);
  console.log("Datasets:", wheel.data.datasets);
  
  // Count checked player checkboxes
  const checkedPlayers = document.querySelectorAll('.wheel-player-item input[type="checkbox"]:checked');
  console.log("Checked player checkboxes:", checkedPlayers.length);
  
  // List the selected players
  const selectedPlayers = getSelectedWheelPlayers();
  console.log("Selected players:", selectedPlayers.map(p => p.name));
  
  // Reinitialize wheel to fix any issues
  initWheel();
}

// Add this to the DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', function() {
  // ...existing code...
  
  // Add wheel debugging on game start
  const startGameBtn = document.getElementById('start-game-btn');
  if (startGameBtn) {
    startGameBtn.addEventListener('click', function() {
      setTimeout(() => {
        debugWheel();
      }, 2000);
    });
  }
});
