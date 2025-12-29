import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const CrossyRoadGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const mapRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const metadataRef = useRef<any[]>([]);
  const positionRef = useRef({ currentRow: 0, currentTile: 0 });
  const movesQueueRef = useRef<string[]>([]);
  const moveClockRef = useRef<THREE.Clock | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  // Game constants
  const minTileIndex = -8;
  const maxTileIndex = 8;
  const tilesPerRow = maxTileIndex - minTileIndex + 1;
  const tileSize = 42;

  // Textures
  const createTexture = (width: number, height: number, rects: any[]) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(0,0,0,0.6)";
    rects.forEach((rect) => {
      context.fillRect(rect.x, rect.y, rect.w, rect.h);
    });
    return new THREE.CanvasTexture(canvas);
  };

  const carFrontTexture = createTexture(40, 80, [{ x: 0, y: 10, w: 30, h: 60 }]);
  const carBackTexture = createTexture(40, 80, [{ x: 10, y: 10, w: 30, h: 60 }]);
  const carRightSideTexture = createTexture(110, 40, [
    { x: 10, y: 0, w: 50, h: 30 },
    { x: 70, y: 0, w: 30, h: 30 },
  ]);
  const carLeftSideTexture = createTexture(110, 40, [
    { x: 10, y: 10, w: 50, h: 30 },
    { x: 70, y: 10, w: 30, h: 30 },
  ]);

  const truckFrontTexture = createTexture(30, 30, [{ x: 5, y: 0, w: 10, h: 30 }]);
  const truckRightSideTexture = createTexture(25, 30, [{ x: 15, y: 5, w: 10, h: 10 }]);
  const truckLeftSideTexture = createTexture(25, 30, [{ x: 15, y: 15, w: 10, h: 10 }]);

  // Game objects creation functions
  const createCamera = () => {
    const size = 300;
    const viewRatio = window.innerWidth / window.innerHeight;
    const width = viewRatio < 1 ? size : size * viewRatio;
    const height = viewRatio < 1 ? size / viewRatio : size;

    const camera = new THREE.OrthographicCamera(
      width / -2, width / 2, height / 2, height / -2, 100, 900
    );

    camera.up.set(0, 0, 1);
    camera.position.set(300, -300, 300);
    camera.lookAt(0, 0, 0);

    return camera;
  };

  const createWheel = (x: number) => {
    const wheel = new THREE.Mesh(
      new THREE.BoxGeometry(12, 33, 12),
      new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true })
    );
    wheel.position.x = x;
    wheel.position.z = 6;
    return wheel;
  };

  const createCar = (initialTileIndex: number, direction: boolean, color: number) => {
    const car = new THREE.Group();
    car.position.x = initialTileIndex * tileSize;
    if (!direction) car.rotation.z = Math.PI;

    const main = new THREE.Mesh(
      new THREE.BoxGeometry(60, 30, 15),
      new THREE.MeshLambertMaterial({ color, flatShading: true })
    );
    main.position.z = 12;
    main.castShadow = true;
    main.receiveShadow = true;
    car.add(main);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(33, 24, 12), [
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carBackTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carFrontTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carRightSideTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carLeftSideTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }),
    ]);
    cabin.position.x = -6;
    cabin.position.z = 25.5;
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    car.add(cabin);

    const frontWheel = createWheel(18);
    car.add(frontWheel);

    const backWheel = createWheel(-18);
    car.add(backWheel);

    return car;
  };

  const createTruck = (initialTileIndex: number, direction: boolean, color: number) => {
    const truck = new THREE.Group();
    truck.position.x = initialTileIndex * tileSize;
    if (!direction) truck.rotation.z = Math.PI;

    const cargo = new THREE.Mesh(
      new THREE.BoxGeometry(70, 35, 35),
      new THREE.MeshLambertMaterial({ color: 0xb4c6fc, flatShading: true })
    );
    cargo.position.x = -15;
    cargo.position.z = 25;
    cargo.castShadow = true;
    cargo.receiveShadow = true;
    truck.add(cargo);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), [
      new THREE.MeshLambertMaterial({ color, flatShading: true, map: truckFrontTexture }),
      new THREE.MeshLambertMaterial({ color, flatShading: true }),
      new THREE.MeshLambertMaterial({ color, flatShading: true, map: truckLeftSideTexture }),
      new THREE.MeshLambertMaterial({ color, flatShading: true, map: truckRightSideTexture }),
      new THREE.MeshPhongMaterial({ color, flatShading: true }),
      new THREE.MeshPhongMaterial({ color, flatShading: true }),
    ]);
    cabin.position.x = 35;
    cabin.position.z = 20;
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    truck.add(cabin);

    const frontWheel = createWheel(37);
    truck.add(frontWheel);

    const middleWheel = createWheel(5);
    truck.add(middleWheel);

    const backWheel = createWheel(-35);
    truck.add(backWheel);

    return truck;
  };

  const createPlayer = () => {
    const player = new THREE.Group();

    // Body - white rounded body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(18, 16, 18),
      new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true })
    );
    body.position.z = 12;
    body.castShadow = true;
    body.receiveShadow = true;
    player.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(12, 10, 14),
      new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true })
    );
    head.position.z = 26;
    head.position.y = 4;
    head.castShadow = true;
    head.receiveShadow = true;
    player.add(head);

    // Red comb (on top of head)
    const comb = new THREE.Mesh(
      new THREE.BoxGeometry(4, 6, 10),
      new THREE.MeshLambertMaterial({ color: 0xe63946, flatShading: true })
    );
    comb.position.z = 35;
    comb.position.y = 4;
    comb.castShadow = true;
    player.add(comb);

    // Wattle (red hanging part under beak)
    const wattle = new THREE.Mesh(
      new THREE.BoxGeometry(3, 4, 5),
      new THREE.MeshLambertMaterial({ color: 0xe63946, flatShading: true })
    );
    wattle.position.z = 20;
    wattle.position.y = 8;
    wattle.castShadow = true;
    player.add(wattle);

    // Beak (orange)
    const beak = new THREE.Mesh(
      new THREE.BoxGeometry(5, 8, 4),
      new THREE.MeshLambertMaterial({ color: 0xffb703, flatShading: true })
    );
    beak.position.z = 26;
    beak.position.y = 10;
    beak.castShadow = true;
    player.add(beak);

    // Left eye
    const leftEye = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 3),
      new THREE.MeshLambertMaterial({ color: 0x1d1d1d, flatShading: true })
    );
    leftEye.position.z = 28;
    leftEye.position.y = 6;
    leftEye.position.x = -5;
    player.add(leftEye);

    // Right eye
    const rightEye = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 3),
      new THREE.MeshLambertMaterial({ color: 0x1d1d1d, flatShading: true })
    );
    rightEye.position.z = 28;
    rightEye.position.y = 6;
    rightEye.position.x = 5;
    player.add(rightEye);

    // Left leg
    const leftLeg = new THREE.Mesh(
      new THREE.BoxGeometry(3, 3, 6),
      new THREE.MeshLambertMaterial({ color: 0xffb703, flatShading: true })
    );
    leftLeg.position.z = 3;
    leftLeg.position.x = -5;
    player.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(
      new THREE.BoxGeometry(3, 3, 6),
      new THREE.MeshLambertMaterial({ color: 0xffb703, flatShading: true })
    );
    rightLeg.position.z = 3;
    rightLeg.position.x = 5;
    player.add(rightLeg);

    // Tail feathers
    const tailFeathers = new THREE.Mesh(
      new THREE.BoxGeometry(10, 8, 16),
      new THREE.MeshLambertMaterial({ color: 0x2d6a4f, flatShading: true })
    );
    tailFeathers.position.z = 18;
    tailFeathers.position.y = -10;
    tailFeathers.rotation.x = -0.3;
    tailFeathers.castShadow = true;
    player.add(tailFeathers);

    // Wing left
    const wingLeft = new THREE.Mesh(
      new THREE.BoxGeometry(4, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xf0f0f0, flatShading: true })
    );
    wingLeft.position.z = 12;
    wingLeft.position.x = -10;
    wingLeft.castShadow = true;
    player.add(wingLeft);

    // Wing right
    const wingRight = new THREE.Mesh(
      new THREE.BoxGeometry(4, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xf0f0f0, flatShading: true })
    );
    wingRight.position.z = 12;
    wingRight.position.x = 10;
    wingRight.castShadow = true;
    player.add(wingRight);

    const playerContainer = new THREE.Group();
    playerContainer.add(player);

    return playerContainer;
  };

  const createGrass = (rowIndex: number) => {
    const grass = new THREE.Group();
    grass.position.y = rowIndex * tileSize;

    const createSection = (color: number) =>
      new THREE.Mesh(
        new THREE.BoxGeometry(tilesPerRow * tileSize, tileSize, 3),
        new THREE.MeshLambertMaterial({ color })
      );

    const middle = createSection(0xbaf455);
    middle.receiveShadow = true;
    grass.add(middle);

    const left = createSection(0x99c846);
    left.position.x = -tilesPerRow * tileSize;
    grass.add(left);

    const right = createSection(0x99c846);
    right.position.x = tilesPerRow * tileSize;
    grass.add(right);

    return grass;
  };

  const createRoad = (rowIndex: number) => {
    const road = new THREE.Group();
    road.position.y = rowIndex * tileSize;

    const createSection = (color: number) =>
      new THREE.Mesh(
        new THREE.PlaneGeometry(tilesPerRow * tileSize, tileSize),
        new THREE.MeshLambertMaterial({ color })
      );

    const middle = createSection(0x454a59);
    middle.receiveShadow = true;
    road.add(middle);

    const left = createSection(0x393d49);
    left.position.x = -tilesPerRow * tileSize;
    road.add(left);

    const right = createSection(0x393d49);
    right.position.x = tilesPerRow * tileSize;
    road.add(right);

    return road;
  };

  const createTree = (tileIndex: number, height: number) => {
    const tree = new THREE.Group();
    tree.position.x = tileIndex * tileSize;

    const trunk = new THREE.Mesh(
      new THREE.BoxGeometry(15, 15, 20),
      new THREE.MeshLambertMaterial({ color: 0x4d2926, flatShading: true })
    );
    trunk.position.z = 10;
    tree.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(30, 30, height),
      new THREE.MeshLambertMaterial({ color: 0x7aa21d, flatShading: true })
    );
    crown.position.z = height / 2 + 20;
    crown.castShadow = true;
    crown.receiveShadow = true;
    tree.add(crown);

    // Add pink flowers to some trees (40% chance)
    if (Math.random() < 0.4) {
      const flowerPositions = [
        { x: 12, y: 10, z: height + 18 },
        { x: -10, y: 12, z: height + 15 },
        { x: 8, y: -11, z: height + 20 },
        { x: -12, y: -8, z: height + 12 },
        { x: 0, y: 14, z: height + 22 },
      ];
      
      const numFlowers = Math.floor(Math.random() * 3) + 2; // 2-4 flowers
      for (let i = 0; i < numFlowers; i++) {
        const pos = flowerPositions[i];
        const flower = new THREE.Mesh(
          new THREE.BoxGeometry(5, 5, 5),
          new THREE.MeshLambertMaterial({ color: 0xff69b4, flatShading: true })
        );
        flower.position.set(pos.x, pos.y, pos.z);
        tree.add(flower);
      }
    }

    return tree;
  };

  const createDirectionalLight = () => {
    const dirLight = new THREE.DirectionalLight();
    dirLight.position.set(-100, -100, 200);
    dirLight.up.set(0, 0, 1);
    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.up.set(0, 0, 1);
    dirLight.shadow.camera.left = -400;
    dirLight.shadow.camera.right = 400;
    dirLight.shadow.camera.top = 400;
    dirLight.shadow.camera.bottom = -400;
    dirLight.shadow.camera.near = 50;
    dirLight.shadow.camera.far = 400;

    return dirLight;
  };

  // Game logic functions
  const randomElement = (array: any[]) => array[Math.floor(Math.random() * array.length)];

  const generateForestMetadata = () => {
    const occupiedTiles = new Set();
    const trees = Array.from({ length: 4 }, () => {
      let tileIndex;
      do {
        tileIndex = THREE.MathUtils.randInt(minTileIndex, maxTileIndex);
      } while (occupiedTiles.has(tileIndex));
      occupiedTiles.add(tileIndex);

      const height = randomElement([20, 45, 60]);
      return { tileIndex, height };
    });

    return { type: "forest", trees };
  };

  const generateCarLaneMetadata = () => {
    const direction = randomElement([true, false]);
    const speed = randomElement([125, 156, 188]);
    const occupiedTiles = new Set();

    const vehicles = Array.from({ length: 3 }, () => {
      let initialTileIndex;
      do {
        initialTileIndex = THREE.MathUtils.randInt(minTileIndex, maxTileIndex);
      } while (occupiedTiles.has(initialTileIndex));
      occupiedTiles.add(initialTileIndex - 1);
      occupiedTiles.add(initialTileIndex);
      occupiedTiles.add(initialTileIndex + 1);

      const color = randomElement([0xa52523, 0xbdb638, 0x78b14b]);
      return { initialTileIndex, color };
    });

    return { type: "car", direction, speed, vehicles };
  };

  const generateTruckLaneMetadata = () => {
    const direction = randomElement([true, false]);
    const speed = randomElement([125, 156, 188]);
    const occupiedTiles = new Set();

    const vehicles = Array.from({ length: 2 }, () => {
      let initialTileIndex;
      do {
        initialTileIndex = THREE.MathUtils.randInt(minTileIndex, maxTileIndex);
      } while (occupiedTiles.has(initialTileIndex));
      for (let i = -2; i <= 2; i++) {
        occupiedTiles.add(initialTileIndex + i);
      }

      const color = randomElement([0xa52523, 0xbdb638, 0x78b14b]);
      return { initialTileIndex, color };
    });

    return { type: "truck", direction, speed, vehicles };
  };

  const generateRow = () => {
    const type = randomElement(["car", "truck", "forest"]);
    if (type === "car") return generateCarLaneMetadata();
    if (type === "truck") return generateTruckLaneMetadata();
    return generateForestMetadata();
  };

  const generateRows = (amount: number) => {
    const rows = [];
    for (let i = 0; i < amount; i++) {
      rows.push(generateRow());
    }
    return rows;
  };

  const calculateFinalPosition = (currentPosition: any, moves: string[]) => {
    return moves.reduce((position, direction) => {
      if (direction === "forward") return { rowIndex: position.rowIndex + 1, tileIndex: position.tileIndex };
      if (direction === "backward") return { rowIndex: position.rowIndex - 1, tileIndex: position.tileIndex };
      if (direction === "left") return { rowIndex: position.rowIndex, tileIndex: position.tileIndex - 1 };
      if (direction === "right") return { rowIndex: position.rowIndex, tileIndex: position.tileIndex + 1 };
      return position;
    }, currentPosition);
  };

  const endsUpInValidPosition = (currentPosition: any, moves: string[]) => {
    const finalPosition = calculateFinalPosition(currentPosition, moves);

    if (
      finalPosition.rowIndex === -1 ||
      finalPosition.tileIndex === minTileIndex - 1 ||
      finalPosition.tileIndex === maxTileIndex + 1
    ) {
      return false;
    }

    const finalRow = metadataRef.current[finalPosition.rowIndex - 1];
    if (
      finalRow &&
      finalRow.type === "forest" &&
      finalRow.trees.some((tree: any) => tree.tileIndex === finalPosition.tileIndex)
    ) {
      return false;
    }

    return true;
  };

  const queueMove = (direction: string) => {
    const isValidMove = endsUpInValidPosition(
      { rowIndex: positionRef.current.currentRow, tileIndex: positionRef.current.currentTile },
      [...movesQueueRef.current, direction]
    );

    if (!isValidMove) return;
    movesQueueRef.current.push(direction);
  };

  const stepCompleted = () => {
    const direction = movesQueueRef.current.shift();

    if (direction === "forward") positionRef.current.currentRow += 1;
    if (direction === "backward") positionRef.current.currentRow -= 1;
    if (direction === "left") positionRef.current.currentTile -= 1;
    if (direction === "right") positionRef.current.currentTile += 1;

    if (positionRef.current.currentRow > metadataRef.current.length - 10) addRows();
    setScore(positionRef.current.currentRow);
  };

  const addRows = () => {
    const newMetadata = generateRows(20);
    const startIndex = metadataRef.current.length;
    metadataRef.current.push(...newMetadata);

    newMetadata.forEach((rowData, index) => {
      const rowIndex = startIndex + index + 1;

      if (rowData.type === "forest") {
        const row = createGrass(rowIndex);
        rowData.trees.forEach(({ tileIndex, height }: any) => {
          const tree = createTree(tileIndex, height);
          row.add(tree);
        });
        mapRef.current?.add(row);
      }

      if (rowData.type === "car") {
        const row = createRoad(rowIndex);
        rowData.vehicles.forEach((vehicle: any) => {
          const car = createCar(vehicle.initialTileIndex, rowData.direction, vehicle.color);
          vehicle.ref = car;
          row.add(car);
        });
        mapRef.current?.add(row);
      }

      if (rowData.type === "truck") {
        const row = createRoad(rowIndex);
        rowData.vehicles.forEach((vehicle: any) => {
          const truck = createTruck(vehicle.initialTileIndex, rowData.direction, vehicle.color);
          vehicle.ref = truck;
          row.add(truck);
        });
        mapRef.current?.add(row);
      }
    });
  };

  const initializeMap = () => {
    metadataRef.current.length = 0;
    if (mapRef.current) {
      mapRef.current.remove(...mapRef.current.children);
    }

    for (let rowIndex = 0; rowIndex > -10; rowIndex--) {
      const grass = createGrass(rowIndex);
      mapRef.current?.add(grass);
    }
    addRows();
  };

  const initializePlayer = () => {
    if (playerRef.current) {
      playerRef.current.position.x = 0;
      playerRef.current.position.y = 0;
      playerRef.current.children[0].position.z = 0;
    }

    positionRef.current.currentRow = 0;
    positionRef.current.currentTile = 0;
    movesQueueRef.current.length = 0;
  };

  const setPosition = (progress: number) => {
    const startX = positionRef.current.currentTile * tileSize;
    const startY = positionRef.current.currentRow * tileSize;
    let endX = startX;
    let endY = startY;

    if (movesQueueRef.current[0] === "left") endX -= tileSize;
    if (movesQueueRef.current[0] === "right") endX += tileSize;
    if (movesQueueRef.current[0] === "forward") endY += tileSize;
    if (movesQueueRef.current[0] === "backward") endY -= tileSize;

    if (playerRef.current) {
      playerRef.current.position.x = THREE.MathUtils.lerp(startX, endX, progress);
      playerRef.current.position.y = THREE.MathUtils.lerp(startY, endY, progress);
      playerRef.current.children[0].position.z = Math.sin(progress * Math.PI) * 8;
    }
  };

  const setRotation = (progress: number) => {
    let endRotation = 0;
    if (movesQueueRef.current[0] == "forward") endRotation = 0;
    if (movesQueueRef.current[0] == "left") endRotation = Math.PI / 2;
    if (movesQueueRef.current[0] == "right") endRotation = -Math.PI / 2;
    if (movesQueueRef.current[0] == "backward") endRotation = Math.PI;

    if (playerRef.current) {
      playerRef.current.children[0].rotation.z = THREE.MathUtils.lerp(
        playerRef.current.children[0].rotation.z,
        endRotation,
        progress
      );
    }
  };

  const animatePlayer = () => {
    if (!movesQueueRef.current.length) return;

    if (!moveClockRef.current?.running) moveClockRef.current?.start();

    const stepTime = 0.2;
    const progress = Math.min(1, (moveClockRef.current?.getElapsedTime() || 0) / stepTime);

    setPosition(progress);
    setRotation(progress);

    if (progress >= 1) {
      stepCompleted();
      moveClockRef.current?.stop();
    }
  };

  const animateVehicles = () => {
    const delta = clockRef.current?.getDelta() || 0;

    metadataRef.current.forEach((rowData) => {
      if (rowData.type === "car" || rowData.type === "truck") {
        const beginningOfRow = (minTileIndex - 2) * tileSize;
        const endOfRow = (maxTileIndex + 2) * tileSize;

        rowData.vehicles.forEach(({ ref }: any) => {
          if (!ref) return;

          if (rowData.direction) {
            ref.position.x = ref.position.x > endOfRow ? beginningOfRow : ref.position.x + rowData.speed * delta;
          } else {
            ref.position.x = ref.position.x < beginningOfRow ? endOfRow : ref.position.x - rowData.speed * delta;
          }
        });
      }
    });
  };

  const hitTest = () => {
    const row = metadataRef.current[positionRef.current.currentRow - 1];
    if (!row) return;

    if (row.type === "car" || row.type === "truck") {
      const playerBoundingBox = new THREE.Box3();
      if (playerRef.current) {
        playerBoundingBox.setFromObject(playerRef.current);

        row.vehicles.forEach(({ ref }: any) => {
          if (!ref) return;

          const vehicleBoundingBox = new THREE.Box3();
          vehicleBoundingBox.setFromObject(ref);

          if (playerBoundingBox.intersectsBox(vehicleBoundingBox)) {
            setGameOver(true);
            setFinalScore(positionRef.current.currentRow);
          }
        });
      }
    }
  };

  const initializeGame = () => {
    initializePlayer();
    initializeMap();
    setScore(0);
    setGameOver(false);
  };

  const animate = () => {
    animateVehicles();
    animatePlayer();
    hitTest();

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (gameOver) return;
    
    if (event.key === "ArrowUp") {
      event.preventDefault();
      queueMove("forward");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      queueMove("backward");
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      queueMove("left");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      queueMove("right");
    }
  };

  // Handle touch/click for mobile controls with proper event handling
  const handleControlPress = (direction: string) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!gameOver) {
      queueMove(direction);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Three.js scene
    sceneRef.current = new THREE.Scene();
    
    // Initialize renderer
    rendererRef.current = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas: canvasRef.current,
    });
    rendererRef.current.setPixelRatio(window.devicePixelRatio);
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current.shadowMap.enabled = true;

    // Initialize game objects
    playerRef.current = createPlayer();
    mapRef.current = new THREE.Group();
    cameraRef.current = createCamera();
    moveClockRef.current = new THREE.Clock(false);
    clockRef.current = new THREE.Clock();

    // Add objects to scene
    sceneRef.current.add(playerRef.current);
    sceneRef.current.add(mapRef.current);

    // Add lighting
    const ambientLight = new THREE.AmbientLight();
    sceneRef.current.add(ambientLight);

    const dirLight = createDirectionalLight();
    dirLight.target = playerRef.current;
    playerRef.current.add(dirLight);

    // Add camera to player
    playerRef.current.add(cameraRef.current);

    // Initialize game
    initializeGame();

    // Start animation loop
    rendererRef.current.setAnimationLoop(animate);

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown);

    // Handle resize
    const handleResize = () => {
      if (rendererRef.current && cameraRef.current) {
        const size = 300;
        const viewRatio = window.innerWidth / window.innerHeight;
        const width = viewRatio < 1 ? size : size * viewRatio;
        const height = viewRatio < 1 ? size / viewRatio : size;

        cameraRef.current.left = width / -2;
        cameraRef.current.right = width / 2;
        cameraRef.current.top = height / 2;
        cameraRef.current.bottom = height / -2;
        cameraRef.current.updateProjectionMatrix();

        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="game-wrapper">
      <canvas ref={canvasRef} className="game-canvas" />
      
      <div className="controls">
        <div className="controls-grid">
          <button 
            className="control-button forward" 
            onTouchStart={handleControlPress("forward")}
            onClick={handleControlPress("forward")}
            aria-label="Move forward"
            type="button"
          >
            ▲
          </button>
          <button 
            className="control-button left" 
            onTouchStart={handleControlPress("left")}
            onClick={handleControlPress("left")}
            aria-label="Move left"
            type="button"
          >
            ◀
          </button>
          <button 
            className="control-button backward" 
            onTouchStart={handleControlPress("backward")}
            onClick={handleControlPress("backward")}
            aria-label="Move backward"
            type="button"
          >
            ▼
          </button>
          <button 
            className="control-button right" 
            onTouchStart={handleControlPress("right")}
            onClick={handleControlPress("right")}
            aria-label="Move right"
            type="button"
          >
            ▶
          </button>
        </div>
      </div>
      
      <div className="score-display">{score}</div>
      
      <div className={`result-container ${gameOver ? 'visible' : ''}`}>
        <div className="result-card">
          <h1 className="result-title">Game Over</h1>
          <p className="result-score">Your score: <span className="score-value">{finalScore}</span></p>
          <button className="retry-button" onClick={initializeGame}>Retry</button>
        </div>
      </div>
    </div>
  );
};

export default CrossyRoadGame;
