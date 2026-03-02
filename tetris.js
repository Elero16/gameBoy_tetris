// Классический Тетрис
class Tetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // Размеры игрового поля
        this.cols = 10;
        this.rows = 20;
        this.cellSize = 27;
        
        // Цвета
        this.colors = {
            dark: '#071820',
            light: '#344c57',
            background: '#ecf4cb',
            pieces: ['#ecf4cb', '#9bb7c4', '#4a6a7a', '#2a5f7a', '#1e3a47', '#0f2c35', '#071820']
        };
        
        // Фигуры Тетриса
        this.pieces = {
            'I': [[[1,1,1,1]], [[1],[1],[1],[1]]],
            'O': [[[1,1], [1,1]]],
            'T': [
                [[0,1,0], [1,1,1]],
                [[1,0], [1,1], [1,0]],
                [[1,1,1], [0,1,0]],
                [[0,1], [1,1], [0,1]]
            ],
            'S': [
                [[0,1,1], [1,1,0]],
                [[1,0], [1,1], [0,1]]
            ],
            'Z': [
                [[1,1,0], [0,1,1]],
                [[0,1], [1,1], [1,0]]
            ],
            'L': [
                [[1,0,0], [1,1,1]],
                [[1,1], [1,0], [1,0]],
                [[1,1,1], [0,0,1]],
                [[0,1], [0,1], [1,1]]
            ],
            'J': [
                [[0,0,1], [1,1,1]],
                [[1,0], [1,0], [1,1]],
                [[1,1,1], [1,0,0]],
                [[1,1], [0,1], [0,1]]
            ]
        };
        
        this.pieceTypes = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];
        
        // Состояние игры
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.highScore = localStorage.getItem('tetrisHighScore') || 0;
        this.gameOver = false;
        this.isPaused = false;
        this.isRunning = false;
        
        // Скорость игры
        this.baseSpeed = 500;
        this.speed = this.baseSpeed;
        this.lastUpdate = 0;
        
        // Инициализация
        this.initBoard();
        this.loadHighScore();
        this.setupEventListeners();
        this.draw();
    }
    
    initBoard() {
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
    }
    
    loadHighScore() {
        document.getElementById('highScore').textContent = this.highScore;
    }
    
    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('tetrisHighScore', this.highScore);
            document.getElementById('highScore').textContent = this.highScore;
        }
    }
    
    createPiece(type = null) {
        if (!type) {
            type = this.pieceTypes[Math.floor(Math.random() * this.pieceTypes.length)];
        }
        const rotations = this.pieces[type];
        return {
            type: type,
            rotation: 0,
            matrix: rotations[0],
            x: Math.floor((this.cols - rotations[0][0].length) / 2),
            y: 0
        };
    }
    
    randomPiece() {
        return this.createPiece(this.pieceTypes[Math.floor(Math.random() * this.pieceTypes.length)]);
    }
    
    collide(piece, newX, newY, newMatrix = null) {
        const matrix = newMatrix || piece.matrix;
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x] !== 0) {
                    const boardX = newX + x;
                    const boardY = newY + y;
                    if (boardX < 0 || boardX >= this.cols || 
                        boardY >= this.rows ||
                        (boardY >= 0 && this.board[boardY][boardX] !== 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    mergePiece() {
        if (!this.currentPiece) return;
        
        const piece = this.currentPiece;
        for (let y = 0; y < piece.matrix.length; y++) {
            for (let x = 0; x < piece.matrix[y].length; x++) {
                if (piece.matrix[y][x] !== 0) {
                    const boardY = piece.y + y;
                    const boardX = piece.x + x;
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.pieceTypes.indexOf(piece.type) + 1;
                    }
                }
            }
        }
        
        this.clearLines();
        
        this.currentPiece = this.nextPiece || this.randomPiece();
        this.nextPiece = this.randomPiece();
        
        // Проверка на Game Over
        if (this.collide(this.currentPiece, this.currentPiece.x, this.currentPiece.y)) {
            this.gameOver = true;
            this.isRunning = false;
            this.saveHighScore();
            
            // Показываем итоговый результат
            const finalScore = this.score;
            const finalLines = this.lines;
            const finalLevel = this.level;
            const record = this.highScore;
            
            this.updateStatus(`ИГРА ОКОНЧЕНА! Счёт: ${finalScore} | Линии: ${finalLines} | Уровень: ${finalLevel} | Рекорд: ${record}`);
            
            // Делаем кнопки активными для новой игры
            this.enableButtons(false);
            document.getElementById('startBtn').disabled = true;
            document.getElementById('pauseBtn').disabled = true;
            document.getElementById('newGameBtn').disabled = false;
        }
    }
    
    clearLines() {
        let linesCleared = 0;
        
        for (let y = this.rows - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(this.cols).fill(0));
                linesCleared++;
                y++;
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.score += linesCleared * 100 * this.level;
            
            this.level = Math.floor(this.lines / 10) + 1;
            this.speed = this.baseSpeed / this.level;
            
            this.updateScore();
        }
    }
    
    updateScore() {
        document.getElementById('currentScore').textContent = this.score;
        document.getElementById('lines').textContent = `Линии ${this.lines}`;
        document.getElementById('level').textContent = `Уровень ${this.level}`;
    }
    
    movePiece(dx, dy) {
        if (!this.currentPiece || !this.isRunning || this.isPaused || this.gameOver) return false;
        
        const newX = this.currentPiece.x + dx;
        const newY = this.currentPiece.y + dy;
        
        if (!this.collide(this.currentPiece, newX, newY)) {
            this.currentPiece.x = newX;
            this.currentPiece.y = newY;
            this.draw();
            return true;
        } else if (dy === 1) {
            this.mergePiece();
            this.draw();
        }
        return false;
    }
    
    rotatePiece() {
        if (!this.currentPiece || !this.isRunning || this.isPaused || this.gameOver) return;
        
        const piece = this.currentPiece;
        const type = piece.type;
        const rotations = this.pieces[type];
        const newRotation = (piece.rotation + 1) % rotations.length;
        const newMatrix = rotations[newRotation];
        
        if (!this.collide(piece, piece.x, piece.y, newMatrix)) {
            piece.matrix = newMatrix;
            piece.rotation = newRotation;
            this.draw();
        }
    }
    
    hardDrop() {
        if (!this.currentPiece || !this.isRunning || this.isPaused || this.gameOver) return;
        
        while (!this.collide(this.currentPiece, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y++;
        }
        this.mergePiece();
        this.draw();
    }
    
    updateStatus(message) {
        const statusEl = document.getElementById('gameStatus');
        statusEl.textContent = message;
        
        // Если игра окончена, показываем жирным шрифтом и золотым цветом
        if (this.gameOver) {
            statusEl.style.fontWeight = 'bold';
            statusEl.style.color = 'gold';
            statusEl.style.fontSize = '14px';
        } else {
            statusEl.style.fontWeight = 'bold';
            statusEl.style.color = '#ecf4cb';
            statusEl.style.fontSize = '14px';
        }
    }
    
    enableButtons(gameActive) {
        document.getElementById('startBtn').disabled = gameActive;
        document.getElementById('pauseBtn').disabled = !gameActive || this.gameOver;
        document.getElementById('newGameBtn').disabled = false;
    }
    
    startGame() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.gameOver = false;
        this.isPaused = false;
        this.enableButtons(true);
        this.updateStatus('Игра идёт...');
        
        if (!this.currentPiece) {
            this.currentPiece = this.randomPiece();
            this.nextPiece = this.randomPiece();
        }
        
        this.gameLoop();
    }
    
    pauseGame() {
        if (!this.isRunning || this.gameOver) return;
        
        this.isPaused = !this.isPaused;
        this.updateStatus(this.isPaused ? 'ПАУЗА' : 'Игра идёт...');
        
        if (!this.isPaused) {
            this.gameLoop();
        }
    }
    
    newGame() {
        this.initBoard();
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.speed = this.baseSpeed;
        this.gameOver = false;
        this.isRunning = false;
        this.isPaused = false;
        
        this.updateScore();
        this.enableButtons(false);
        this.updateStatus('Готов к игре');
        this.draw();
        
        // Сбрасываем стиль статуса
        const statusEl = document.getElementById('gameStatus');
        statusEl.style.fontWeight = 'bold';
        statusEl.style.color = '#ecf4cb';
        statusEl.style.fontSize = '14px';
    }
    
    gameLoop(timestamp = 0) {
        if (!this.isRunning || this.isPaused || this.gameOver) return;
        
        if (timestamp - this.lastUpdate > this.speed) {
            this.movePiece(0, 1);
            this.lastUpdate = timestamp;
        }
        
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
    
    draw() {
        // Очистка канвасов
        this.ctx.fillStyle = this.colors.dark;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.nextCtx.fillStyle = this.colors.dark;
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        // Отрисовка игрового поля
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.board[y][x] !== 0) {
                    this.drawCell(x, y, this.board[y][x], this.ctx);
                } else {
                    this.drawEmptyCell(x, y, this.ctx);
                }
            }
        }
        
        // Отрисовка текущей фигуры
        if (this.currentPiece) {
            const piece = this.currentPiece;
            for (let y = 0; y < piece.matrix.length; y++) {
                for (let x = 0; x < piece.matrix[y].length; x++) {
                    if (piece.matrix[y][x] !== 0) {
                        const pieceType = this.pieceTypes.indexOf(piece.type) + 1;
                        this.drawCell(piece.x + x, piece.y + y, pieceType, this.ctx);
                    }
                }
            }
        }
        
        // Отрисовка следующей фигуры
        if (this.nextPiece) {
            const piece = this.nextPiece;
            const offsetX = (this.nextCanvas.width / this.cellSize - piece.matrix[0].length) * this.cellSize / 2;
            const offsetY = (this.nextCanvas.height / this.cellSize - piece.matrix.length) * this.cellSize / 2;
            
            for (let y = 0; y < piece.matrix.length; y++) {
                for (let x = 0; x < piece.matrix[y].length; x++) {
                    if (piece.matrix[y][x] !== 0) {
                        const pieceType = this.pieceTypes.indexOf(piece.type) + 1;
                        this.drawCell(x, y, pieceType, this.nextCtx, offsetX / this.cellSize, offsetY / this.cellSize);
                    }
                }
            }
        }
        
        // Рисуем сетку
        this.drawGrid(this.ctx);
        this.drawGrid(this.nextCtx, 4);
    }
    
    drawCell(x, y, type, ctx, offsetX = 0, offsetY = 0) {
        ctx.fillStyle = this.colors.pieces[type % this.colors.pieces.length];
        ctx.fillRect(
            (x + offsetX) * this.cellSize + 1, 
            (y + offsetY) * this.cellSize + 1, 
            this.cellSize - 2, 
            this.cellSize - 2
        );
        
        ctx.strokeStyle = this.colors.light;
        ctx.lineWidth = 1;
        ctx.strokeRect(
            (x + offsetX) * this.cellSize + 1, 
            (y + offsetY) * this.cellSize + 1, 
            this.cellSize - 2, 
            this.cellSize - 2
        );
    }
    
    drawEmptyCell(x, y, ctx, offsetX = 0, offsetY = 0) {
        ctx.fillStyle = this.colors.dark;
        ctx.fillRect(
            (x + offsetX) * this.cellSize, 
            (y + offsetY) * this.cellSize, 
            this.cellSize, 
            this.cellSize
        );
        
        ctx.strokeStyle = this.colors.light;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(
            (x + offsetX) * this.cellSize, 
            (y + offsetY) * this.cellSize, 
            this.cellSize, 
            this.cellSize
        );
    }
    
    drawGrid(ctx, lineWidth = 1) {
        ctx.strokeStyle = this.colors.light;
        ctx.lineWidth = lineWidth;
        
        for (let i = 0; i <= this.cols; i++) {
            ctx.beginPath();
            ctx.moveTo(i * this.cellSize, 0);
            ctx.lineTo(i * this.cellSize, this.canvas ? this.canvas.height : this.nextCanvas.height);
            ctx.stroke();
        }
        
        for (let i = 0; i <= this.rows; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * this.cellSize);
            ctx.lineTo(this.canvas ? this.canvas.width : this.nextCanvas.width, i * this.cellSize);
            ctx.stroke();
        }
    }
    
    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseGame());
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        
        document.addEventListener('keydown', (e) => {
            if (!this.isRunning || this.isPaused || this.gameOver) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.movePiece(-1, 0);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.movePiece(1, 0);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.movePiece(0, 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.rotatePiece();
                    break;
                case ' ':
                    e.preventDefault();
                    this.hardDrop();
                    break;
                case 'p':
                case 'P':
                    this.pauseGame();
                    break;
            }
        });
    }
}

// Запуск игры
window.addEventListener('load', () => {
    new Tetris();
});
