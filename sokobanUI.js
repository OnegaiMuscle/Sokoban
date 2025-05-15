 // Architecture hexagonale avec programmation fonctionnelle

        // =============== MODÈLE PUREMENT FONCTIONNEL (DOMAINE) ===============

        // Constantes pour les types de tuiles
        const TILE_TYPES = {
          WALL: '#',
          FLOOR: ' ',
          TARGET: '.',
          BOX: '$',
          PLAYER: '@',
          BOX_ON_TARGET: '*',
          PLAYER_ON_TARGET: '+'
      };

      // Directions
      const DIRECTIONS = {
          UP: { dx: 0, dy: -1, name: 'up' },
          DOWN: { dx: 0, dy: 1, name: 'down' },
          LEFT: { dx: -1, dy: 0, name: 'left' },
          RIGHT: { dx: 1, dy: 0, name: 'right' }
      };

      // Fonctions pures pour manipuler l'état du jeu
      const GameModel = (() => {
          // Analyse un niveau et crée un état de jeu initial
          const parseLevel = (levelData) => {
              const rows = levelData.trim().split('\n');
              const gridHeight = rows.length;
              const gridWidth = Math.max(...rows.map(row => row.length));

              let grid = [];
              let boxes = [];
              let targets = [];
              let player = { x: 0, y: 0 };

              for (let y = 0; y < gridHeight; y++) {
                  const row = rows[y].padEnd(gridWidth, ' ');
                  const gridRow = [];

                  for (let x = 0; x < gridWidth; x++) {
                      const char = row[x] || ' ';
                      let cell = TILE_TYPES.FLOOR;

                      switch (char) {
                          case TILE_TYPES.WALL:
                              cell = TILE_TYPES.WALL;
                              break;
                          case TILE_TYPES.TARGET:
                              cell = TILE_TYPES.TARGET;
                              targets.push({ x, y });
                              break;
                          case TILE_TYPES.BOX:
                              cell = TILE_TYPES.FLOOR;
                              boxes.push({ x, y });
                              break;
                          case TILE_TYPES.PLAYER:
                              cell = TILE_TYPES.FLOOR;
                              player = { x, y };
                              break;
                          case TILE_TYPES.BOX_ON_TARGET:
                              cell = TILE_TYPES.TARGET;
                              boxes.push({ x, y });
                              targets.push({ x, y });
                              break;
                          case TILE_TYPES.PLAYER_ON_TARGET:
                              cell = TILE_TYPES.TARGET;
                              player = { x, y };
                              targets.push({ x, y });
                              break;
                      }

                      gridRow.push(cell);
                  }

                  grid.push(gridRow);
              }

              return {
                  grid,
                  player,
                  boxes,
                  targets,
                  gridWidth,
                  gridHeight,
                  moves: 0,
                  pushes: 0,
                  history: []
              };
          };

          // Vérifie si une position contient un mur
          const isWall = (state, x, y) =>
              y >= 0 &&
              y < state.grid.length &&
              x >= 0 &&
              x < state.grid[y].length &&
              state.grid[y][x] === TILE_TYPES.WALL;

          // Vérifie si une position contient une boîte
          const hasBox = (state, x, y) =>
              state.boxes.some(box => box.x === x && box.y === y);

          // Trouve l'index d'une boîte à une position donnée
          const findBoxIndex = (state, x, y) =>
              state.boxes.findIndex(box => box.x === x && box.y === y);

          // Vérifie si une position est une cible
          const isTarget = (state, x, y) =>
              state.targets.some(target => target.x === x && target.y === y);

          // Essaie de déplacer le joueur et retourne le nouvel état
          const movePlayer = (state, direction) => {
              const dx = direction.dx;
              const dy = direction.dy;
              const newX = state.player.x + dx;
              const newY = state.player.y + dy;

              // Vérifier si la destination est un mur
              if (isWall(state, newX, newY)) {
                  return state; // Mouvement impossible, état inchangé
              }

              // Clone profond de l'état pour éviter les mutations
              const newState = {
                  ...state,
                  player: { ...state.player },
                  boxes: state.boxes.map(box => ({ ...box })),
                  history: [...state.history, {
                      player: { ...state.player },
                      boxes: state.boxes.map(box => ({ ...box })),
                      moves: state.moves,
                      pushes: state.pushes
                  }],
                  moves: state.moves + 1
              };

              // Vérifier si la destination contient une boîte
              if (hasBox(state, newX, newY)) {
                  const newBoxX = newX + dx;
                  const newBoxY = newY + dy;

                  // Vérifier si la boîte peut être poussée
                  if (isWall(state, newBoxX, newBoxY) || hasBox(state, newBoxX, newBoxY)) {
                      return state; // Mouvement impossible, état inchangé
                  }

                  // Déplacer la boîte
                  const boxIndex = findBoxIndex(state, newX, newY);
                  newState.boxes[boxIndex] = { x: newBoxX, y: newBoxY };
                  newState.pushes = state.pushes + 1;
              }

              // Déplacer le joueur
              newState.player = { x: newX, y: newY };

              return newState;
          };

          // Annule le dernier mouvement
          const undoMove = (state) => {
              if (state.history.length === 0) {
                  return state; // Pas d'historique, état inchangé
              }

              const previousState = state.history[state.history.length - 1];

              return {
                  ...state,
                  player: { ...previousState.player },
                  boxes: previousState.boxes.map(box => ({ ...box })),
                  moves: previousState.moves,
                  pushes: previousState.pushes,
                  history: state.history.slice(0, -1)
              };
          };

          // Vérifie si le niveau est terminé
          const isLevelComplete = (state) =>
              state.boxes.every(box =>
                  state.targets.some(target => target.x === box.x && target.y === box.y)
              );

          return {
              parseLevel,
              isWall,
              hasBox,
              isTarget,
              movePlayer,
              undoMove,
              isLevelComplete
          };
      })();

      // =============== ADAPTATEURS ET PORTS ===============

      // Adaptateur pour le stockage local
      const StorageAdapter = (() => {
          const STORAGE_KEY = 'sokoban_progress';

          // Charge la progression
          const loadProgress = () => {
              try {
                  const stored = localStorage.getItem(STORAGE_KEY);
                  return stored ? JSON.parse(stored) : {};
              } catch (e) {
                  console.error('Erreur lors du chargement de la progression:', e);
                  return {};
              }
          };

          // Sauvegarde la progression
          const saveProgress = (progress) => {
              try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
                  return true;
              } catch (e) {
                  console.error('Erreur lors de la sauvegarde de la progression:', e);
                  return false;
              }
          };

          // Sauvegarde la progression pour un niveau spécifique
          const saveLevelProgress = (levelId, moves, pushes) => {
              const progress = loadProgress();
              const currentBest = progress[levelId] || { moves: Infinity, pushes: Infinity };

              // Ne sauvegarder que si c'est une meilleure performance
              if (moves < currentBest.moves ||
                  (moves === currentBest.moves && pushes < currentBest.pushes)) {
                  progress[levelId] = { moves, pushes };
                  saveProgress(progress);
              }

              return progress;
          };

          // Réinitialise toute la progression
          const resetProgress = () => {
              try {
                  localStorage.removeItem(STORAGE_KEY);
                  return true;
              } catch (e) {
                  console.error('Erreur lors de la réinitialisation de la progression:', e);
                  return false;
              }
          };

          return {
              loadProgress,
              saveLevelProgress,
              resetProgress
          };
      })();

      // Adaptateur pour le dépôt des niveaux
      const LevelRepository = (() => {
          // Définition des niveaux du jeu
          const levels = [
              {
                  id: 1,
                  name: "Niveau 1",
                  data:
`#####
#@  #
# $ #
# . #
#####`
              },
              {
                  id: 2,
                  name: "Niveau 2",
                  data:
`  ####
###  ####
#     $ #
# #.#@  #
# $ .####
#####`
              },
              {
                  id: 3,
                  name: "Niveau 3",
                  data:
`########
#      #
# .**$@#
#      #
#  $ ###
#  ###
####`
              },
              {
                  id: 4,
                  name: "Niveau 4",
                  data:
`#######
#     #
# .$. #
# $@$ #
# .$. #
#     #
#######`
              },
              {
                  id: 5,
                  name: "Niveau 5",
                  data:
`  #####
###   #
# $ # ##
# #  . #
#    # #
## #   #
#@  ###
#####`
              }
          ];

          // Récupère tous les niveaux
          const getLevels = () => levels;

          // Récupère un niveau par son ID
          const getLevelById = (id) => levels.find(level => level.id === id);

          return {
              getLevels,
              getLevelById
          };
      })();

      // Adaptateur pour l'interface utilisateur
      const UIAdapter = (() => {
          // Éléments DOM
          const elements = {
              gameBoard: document.getElementById('game-board'),
              levelSelect: document.getElementById('level-select'),
              restartBtn: document.getElementById('restart-btn'),
              undoBtn: document.getElementById('undo-btn'),
              resetProgressBtn: document.getElementById('reset-progress-btn'),
              moveCounter: document.querySelector('.move-counter'),
              pushCounter: document.querySelector('.push-counter'),
              victoryMessage: document.getElementById('victory-message'),
              victoryMoves: document.getElementById('victory-moves'),
              victoryPushes: document.getElementById('victory-pushes'),
              nextLevelBtn: document.getElementById('next-level-btn'),
              progressContainer: document.getElementById('progress-container'),
              dPadButtons: {
                  up: document.getElementById('up-btn'),
                  left: document.getElementById('left-btn'),
                  right: document.getElementById('right-btn'),
                  down: document.getElementById('down-btn')
              }
          };

          // Calcule la position en pixels d'une entité
          const calculatePosition = (x, y) => ({
              left: x * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) + 1),
              top: y * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) + 1)
          });

          // Rend le plateau de jeu
          const renderBoard = (state) => {
              elements.gameBoard.innerHTML = '';
              elements.gameBoard.style.gridTemplateColumns = `repeat(${state.gridWidth}, var(--cell-size))`;
              elements.gameBoard.style.gridTemplateRows = `repeat(${state.gridHeight}, var(--cell-size))`;

              // Créer les cellules (murs, sols, cibles)
              for (let y = 0; y < state.gridHeight; y++) {
                  for (let x = 0; x < state.gridWidth; x++) {
                      const cell = document.createElement('div');
                      cell.classList.add('cell');
                      cell.dataset.x = x;
                      cell.dataset.y = y;

                      if (GameModel.isWall(state, x, y)) {
                          cell.classList.add('wall');
                      } else if (GameModel.isTarget(state, x, y)) {
                          cell.classList.add('target');
                      }

                      elements.gameBoard.appendChild(cell);
                  }
              }

              // Ajouter les boîtes
              state.boxes.forEach((box, index) => {
                  const boxElement = document.createElement('div');
                  boxElement.classList.add('entity', 'box');
                  boxElement.id = `box-${index}`;

                  if (GameModel.isTarget(state, box.x, box.y)) {
                      boxElement.classList.add('on-target');
                  }

                  const position = calculatePosition(box.x, box.y);
                  boxElement.style.transform = `translate(${position.left}px, ${position.top}px)`;

                  elements.gameBoard.appendChild(boxElement);
              });

              // Ajouter le joueur
              const playerElement = document.createElement('div');
              playerElement.classList.add('entity', 'player');
              playerElement.id = 'player';

              const playerPosition = calculatePosition(state.player.x, state.player.y);
              playerElement.style.transform = `translate(${playerPosition.left}px, ${playerPosition.top}px)`;

              elements.gameBoard.appendChild(playerElement);
          };

          // Met à jour la position des entités sans redessiner tout le plateau
          const updateEntityPositions = (oldState, newState) => {
              // Mise à jour du joueur
              const playerElement = document.getElementById('player');
              const playerPosition = calculatePosition(newState.player.x, newState.player.y);
              playerElement.style.transform = `translate(${playerPosition.left}px, ${playerPosition.top}px)`;

              // Mise à jour des boîtes
              newState.boxes.forEach((box, index) => {
                  const boxElement = document.getElementById(`box-${index}`);
                  const boxPosition = calculatePosition(box.x, box.y);
                  boxElement.style.transform = `translate(${boxPosition.left}px, ${boxPosition.top}px)`;

                  // Mise à jour de la classe on-target
                  if (GameModel.isTarget(newState, box.x, box.y)) {
                      boxElement.classList.add('on-target');
                  } else {
                      boxElement.classList.remove('on-target');
                  }
              });
          };

          // Met à jour les compteurs
          const updateCounters = (state) => {
              elements.moveCounter.textContent = state.moves;
              elements.pushCounter.textContent = state.pushes;
              elements.undoBtn.disabled = state.history.length === 0;
          };

          // Affiche le message de victoire
          const showVictory = (state) => {
              elements.victoryMoves.textContent = state.moves;
              elements.victoryPushes.textContent = state.pushes;
              elements.victoryMessage.style.display = 'flex';
          };

          // Cache le message de victoire
          const hideVictory = () => {
              elements.victoryMessage.style.display = 'none';
          };

          // Remplit le sélecteur de niveaux
          const populateLevelSelect = (levels, currentLevelId) => {
              elements.levelSelect.innerHTML = '';

              levels.forEach(level => {
                  const option = document.createElement('option');
                  option.value = level.id;
                  option.textContent = level.name;
                  elements.levelSelect.appendChild(option);
              });

              elements.levelSelect.value = currentLevelId;
          };

          // Affiche la progression des niveaux
          const renderProgress = (levels, progress) => {
              elements.progressContainer.innerHTML = '';

              levels.forEach(level => {
                  const levelProgress = document.createElement('div');
                  levelProgress.classList.add('level-progress');

                  if (progress[level.id]) {
                      levelProgress.classList.add('completed');
                  }

                  const levelName = document.createElement('div');
                  levelName.textContent = `Niveau ${level.id}`;
                  levelProgress.appendChild(levelName);

                  if (progress[level.id]) {
                      const bestScore = document.createElement('div');
                      bestScore.classList.add('best-moves');
                      bestScore.textContent = `${progress[level.id].moves} mvts`;
                      levelProgress.appendChild(bestScore);
                  }

                  levelProgress.addEventListener('click', () => {
                      elements.levelSelect.value = level.id;
                      // Déclencher l'événement change
                      const event = new Event('change');
                      elements.levelSelect.dispatchEvent(event);
                  });

                  elements.progressContainer.appendChild(levelProgress);
              });
          };

          return {
              elements,
              renderBoard,
              updateEntityPositions,
              updateCounters,
              showVictory,
              hideVictory,
              populateLevelSelect,
              renderProgress
          };
      })();

      // =============== APPLICATION ===============

      // Application principale - orchestration des composants
      const SokobanApp = ((UIAdapter, StorageAdapter, LevelRepository, GameModel) => {
          // État global de l'application
          let gameState = null;
          let currentLevelId = 1;
          let animating = false;

          // Charge un niveau par son ID
          const loadLevel = (levelId) => {
              const level = LevelRepository.getLevelById(levelId);
              if (!level) return false;

              gameState = GameModel.parseLevel(level.data);
              currentLevelId = levelId;

              UIAdapter.renderBoard(gameState);
              UIAdapter.updateCounters(gameState);
              UIAdapter.hideVictory();
              UIAdapter.populateLevelSelect(LevelRepository.getLevels(), currentLevelId);

              return true;
          };

          // Gère le mouvement du joueur
          const handleMove = (directionName) => {
              if (animating) return;

              const directionMap = {
                  up: DIRECTIONS.UP,
                  down: DIRECTIONS.DOWN,
                  left: DIRECTIONS.LEFT,
                  right: DIRECTIONS.RIGHT
              };

              const direction = directionMap[directionName];
              if (!direction) return;

              const oldState = gameState;
              const newState = GameModel.movePlayer(gameState, direction);

              // Si l'état a changé (mouvement valide)
              if (newState !== oldState) {
                  gameState = newState;

                  // Animer le mouvement
                  animating = true;
                  UIAdapter.updateEntityPositions(oldState, newState);
                  UIAdapter.updateCounters(newState);

                  // Attendre la fin de l'animation
                  setTimeout(() => {
                      animating = false;

                      // Vérifier si niveau terminé
                      if (GameModel.isLevelComplete(newState)) {
                          // Sauvegarder la progression
                          const progress = StorageAdapter.saveLevelProgress(
                              currentLevelId,
                              newState.moves,
                              newState.pushes
                          );

                          // Mettre à jour l'affichage de la progression
                          UIAdapter.renderProgress(LevelRepository.getLevels(), progress);
                          UIAdapter.showVictory(newState);
                      }
                  }, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--animation-duration').slice(0, -1)) * 1000);
              }
          };

          // Gère l'annulation d'un mouvement
          const handleUndo = () => {
              if (animating) return;

              const oldState = gameState;
              const newState = GameModel.undoMove(gameState);

              if (newState !== oldState && newState.history.length < oldState.history.length) {
                  gameState = newState;

                  // Animer le mouvement inverse
                  animating = true;
                  UIAdapter.updateEntityPositions(oldState, newState);
                  UIAdapter.updateCounters(newState);

                  setTimeout(() => {
                      animating = false;
                  }, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--animation-duration').slice(0, -1)) * 1000);
              }
          };

          // Redémarre le niveau actuel
          const handleRestart = () => {
              if (animating) return;
              loadLevel(currentLevelId);
          };

          // Passe au niveau suivant
          const handleNextLevel = () => {
              if (animating) return;

              const nextLevelId = currentLevelId + 1;
              const nextLevel = LevelRepository.getLevelById(nextLevelId);

              if (nextLevel) {
                  loadLevel(nextLevelId);
              } else {
                  // Si pas de niveau suivant, on revient au premier niveau
                  loadLevel(1);
              }
          };

          // Réinitialise toute la progression
          const handleResetProgress = () => {
              if (confirm('Êtes-vous sûr de vouloir réinitialiser toute votre progression ?')) {
                  StorageAdapter.resetProgress();
                  UIAdapter.renderProgress(LevelRepository.getLevels(), {});
              }
          };

          // Initialise l'application
          const init = () => {
              // Charger le premier niveau
              loadLevel(1);

              // Mettre à jour l'affichage de la progression
              const progress = StorageAdapter.loadProgress();
              UIAdapter.renderProgress(LevelRepository.getLevels(), progress);

              // Configurer les événements
              UIAdapter.elements.levelSelect.addEventListener('change', (e) => {
                  loadLevel(parseInt(e.target.value));
              });

              UIAdapter.elements.restartBtn.addEventListener('click', handleRestart);
              UIAdapter.elements.undoBtn.addEventListener('click', handleUndo);
              UIAdapter.elements.nextLevelBtn.addEventListener('click', handleNextLevel);
              UIAdapter.elements.resetProgressBtn.addEventListener('click', handleResetProgress);

              // Configurer les touches clavier
              document.addEventListener('keydown', (event) => {
                  switch (event.key) {
                      case 'ArrowUp':
                          handleMove('up');
                          event.preventDefault();
                          break;
                      case 'ArrowDown':
                          handleMove('down');
                          event.preventDefault();
                          break;
                      case 'ArrowLeft':
                          handleMove('left');
                          event.preventDefault();
                          break;
                      case 'ArrowRight':
                          handleMove('right');
                          event.preventDefault();
                          break;
                      case 'z':
                          if (event.ctrlKey) {
                              handleUndo();
                              event.preventDefault();
                          }
                          break;
                      case 'r':
                          handleRestart();
                          event.preventDefault();
                          break;
                  }
              });

              // Configurer les boutons du D-Pad virtuel
              UIAdapter.elements.dPadButtons.up.addEventListener('click', () => handleMove('up'));
              UIAdapter.elements.dPadButtons.down.addEventListener('click', () => handleMove('down'));
              UIAdapter.elements.dPadButtons.left.addEventListener('click', () => handleMove('left'));
              UIAdapter.elements.dPadButtons.right.addEventListener('click', () => handleMove('right'));
          };

          return {
              init
          };
      })(UIAdapter, StorageAdapter, LevelRepository, GameModel);


      
      document.addEventListener('DOMContentLoaded', SokobanApp.init);
