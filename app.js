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
  
  if (isComplete) {
    updateScore(currentPlayer.id, currentCard.points);
  } else {
    updateScore(currentPlayer.id, -Math.abs(currentCard.points));
  }
  
  document.querySelector('.action-buttons').style.display = 'none';
  nextPlayer();
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
    
    scoreList.appendChild(li);
  });

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
  
  return gameState.players.reduce((leader, player) => {
    return (player.score > leader.score) ? player : leader;
  }, gameState.players[0]);
}

// Update the leader status text
function updateLeaderStatus() {
  const leaderStatus = document.getElementById('leader-status');
  if (!leaderStatus) return;
  
  const leadingPlayer = findLeadingPlayer();
  
  if (leadingPlayer && leadingPlayer.score > 0) {
    leaderStatus.innerHTML = `<span class="leader-highlight">${leadingPlayer.name}</span> is in the lead!`;
  } else if (gameState.players.length > 0) {
    leaderStatus.textContent = "Game just started!";
  } else {
    leaderStatus.textContent = "";
  }
}

// Enhance the existing spinner functionality
function showSpinner(excludeId) {
  // Update the visible spinner instead of modal
  const spinnerImg = document.getElementById('spinner-img');
  const spinnerResult = document.getElementById('spinner-result');
  
  if (spinnerResult) {
    spinnerResult.textContent = 'Spinning...';
  }
  
  // Add spinning animation
  if (spinnerImg) {
    spinnerImg.style.transform = `rotate(${Math.floor(Math.random() * 1080) + 360}deg)`;
  }

  return new Promise(resolve => {
    setTimeout(() => {
      const chosen = spinForParticipant(excludeId);
      
      if (spinnerResult) {
        spinnerResult.textContent = `Chosen: ${chosen.name}`;
      }
      
      setTimeout(() => {
        resolve(chosen);
      }, 1000);
    }, 2000);
  });
}

// Make sure to update score and check for winner
function updateScore(playerId, points) {
  const player = gameState.players.find(p => p.id === playerId);
  if (player) {
    player.score += points;
    renderScoreboard();
    highlightScore(playerId);
    playSound('assets/score-up.mp3');
    
    // Check for winner
    if (player.score >= gameState.pointThreshold) {
      endGame(player);
    }
  }
}

function resolveCard(card, currentPlayer) {
  switch (card.type) {
    case "Heart":
      handleHeartCard(card, currentPlayer);
      break;
    case "Mind":
      handleMindCard(card, currentPlayer);
      break;
    case "Soul":
      handleSoulCard(card, currentPlayer);
      break;
    case "Ego":
      handleEgoCard(card, currentPlayer);
      break;
    case "ActOut":
      handleActOutCard(card, currentPlayer);
      break;
    case "Penalty":
      handlePenaltyCard(card, currentPlayer);
      break;
    case "Wildcard":
      handleWildcardCard(card, currentPlayer);
      break;
    default:
      console.warn("Unknown card type:", card.type);
      break;
  }
}

function handleHeartCard(card, currentPlayer) {
  updateScore(currentPlayer.id, card.points);
  alert(`${currentPlayer.name} gains ${card.points} points from a Heart card!`);
}

function handleMindCard(card, currentPlayer) {
  if (card.timeLimit && card.timeLimit > 0) {
    startTimer(card.timeLimit, () => {
      alert("Time's up!");
      // Optional penalty logic can be added here
    });
  }
  updateScore(currentPlayer.id, card.points);
  alert(`${currentPlayer.name} gains ${card.points} points from a Mind card!`);
}

function handleSoulCard(card, currentPlayer) {
  updateScore(currentPlayer.id, card.points);
  alert(`${currentPlayer.name} gains ${card.points} points from a Soul card!`);
}

function handleEgoCard(card, currentPlayer) {
  updateScore(currentPlayer.id, card.points);
  alert(`${currentPlayer.name} gains ${card.points} points from an Ego card!`);
}

function spinForParticipant(excludeId) {
  const possiblePlayers = gameState.players.filter(p => p.id !== excludeId);
  const randomIndex = Math.floor(Math.random() * possiblePlayers.length);
  return possiblePlayers[randomIndex];
}

function showSpinner(excludeId) {
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
    showSpinner(currentPlayer.id).then(() => {
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

function highlightScore(playerId) {
  const scoreElement = document.getElementById(playerId);
  if (!scoreElement) return;
  
  scoreElement.classList.add('score-highlight');
  setTimeout(() => {
    scoreElement.classList.remove('score-highlight');
  }, 1000);
}

function playSound(soundPath) {
  const audio = new Audio(soundPath);
  audio.play().catch(err => console.log('Sound playback error:', err));
}

function endGame(winner) {
  stopTimer(); // Stop any running timer
  document.getElementById('game-board').style.display = 'none';
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
