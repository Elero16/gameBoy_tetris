class Tetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.cols = 10;
        this.rows = 20;
        this.cellSize = 30; // Немного увеличил для четкости
        
        this.colors = {
            dark: '#071820',
            light: '#344c57',
            pieces: [
                null,
                '#FF0D72', // T
                '#0DC2FF', // I
                '#0DFF72', // S
                '#F538FF', // Z
                '#FF8E0D', // L
                '#FFE138', // O
                '#3877FF'  // J
            ]
        };
        
        this.pieceShapes = {
            'T': [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
            'I': [[0, 2, 0, 0], [0, 2, 0, 0], [0, 2, 0, 0], [0, 2, 0, 0]],
            'S': [[0, 3, 3], [3, 3, 0], [0, 0, 0]],
            'Z': [[4, 4, 0], [0, 4, 4], [0, 0, 0]],
            'L': [[0, 5, 0], [0, 5, 0], [0, 5, 5]],
            'O': [[6, 6], [6, 6]],
            'J': [[0, 7, 0], [0, 7, 0], [7, 7, 0]]
        };
        
        this.reset();
        this.highScore = localStorage.getItem('tetrisHighScore') || 0;
        this.loadHighScore();
        this.setupEventListeners();
        this.draw();
    }

    reset() {
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.isPaused = false;
        this.isRunning = false;
        this.currentPiece = null;
        this.nextPiece = this.createPiece();
        this.updateScore();
    }

    createPiece() {
        const types = Object.keys(this.pieceShapes);
        const type = types[Math.floor(Math.random() * types.length)];
        const matrix = this.pieceShapes[type];
        return {
            matrix: JSON.parse(JSON.stringify(matrix)),
            pos: { x: Math.floor(this.cols / 2) - Math.floor(matrix[0].length / 2), y: 0 }
        };
    }

    // ГЛАВНОЕ: Логика поворота матрицы
    rotate(matrix) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }
        matrix.forEach(row => row.reverse());
    }

    rotatePiece() {
        if (!this.isRunning || this.isPaused) return;
        const pos = this.currentPiece.pos.x;
        let offset = 1;
        this.rotate(this.currentPiece.matrix);
        
        // Wall Kick: если при повороте врезались в стену, пробуем подвинуть
        while (this.collide()) {
            this.currentPiece.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.currentPiece.matrix[0].length) {
                // Если не удалось подвинуть, возвращаем всё назад
                this.rotate(this.currentPiece.matrix);
                this.rotate(this.currentPiece.matrix);
                this.rotate(this.currentPiece.matrix);
                this.currentPiece.pos.x = pos;
                return;
            }
        }
        this.draw();
    }

    collide() {
        const [m, o] = [this.currentPiece.matrix, this.currentPiece.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                   (this.board[y + o.y] && this.board[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    merge() {
        this.currentPiece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.board[y + this.currentPiece.pos.y][x + this.currentPiece.pos.x] = value;
                }
            });
        });
    }

    drop() {
        if (!this.isRunning || this.isPaused) return;
        this.currentPiece.pos.y++;
        if (this.collide()) {
            this.currentPiece.pos.y--;
            this.merge();
            this.resetPiece();
            this.arenaSweep();
            this.updateScore();
        }
        this.lastUpdate = performance.now();
        this.draw();
    }

    resetPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.createPiece();
        if (this.collide()) {
            this.gameOver = true;
            this.isRunning = false;
            this.saveHighScore();
            this.updateStatus("GAME OVER!");
        }
    }

    arenaSweep() {
        let rowCount = 1;
        outer: for (let y = this.board.length - 1; y > 0; --y) {
            for (let x = 0; x < this.board[y].length; ++x) {
                if (this.board[y][x] === 0) continue outer;
            }
            const row = this.board.splice(y, 1)[0].fill(0);
            this.board.unshift(row);
            ++y;
            this.score += rowCount * 10;
            this.lines++;
            rowCount *= 2;
        }
        this.level = Math.floor(this.lines / 10) + 1;
    }

    draw() {
        this.ctx.fillStyle = this.colors.dark;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawMatrix(this.board, {x: 0, y: 0}, this.ctx);
        if (this.currentPiece) {
            this.drawMatrix(this.currentPiece.matrix, this.currentPiece.pos, this.ctx);
        }

        // Отрисовка следующей фигуры
        this.nextCtx.fillStyle = this.colors.dark;
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        this.drawMatrix(this.nextPiece.matrix, {x: 1, y: 1}, this.nextCtx);
    }

    drawMatrix(matrix, offset, context) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    context.fillStyle = this.colors.pieces[value];
                    context.fillRect((x + offset.x) * this.cellSize,
                                   (y + offset.y) * this.cellSize,
                                   this.cellSize - 1, this.cellSize - 1);
                    // Добавим блик для красоты
                    context.strokeStyle = 'white';
                    context.lineWidth = 0.5;
                    context.strokeRect((x + offset.x) * this.cellSize, (y + offset.y) * this.cellSize, this.cellSize-1, this.cellSize-1);
                }
            });
        });
    }

    updateScore() {
        document.getElementById('currentScore').innerText = this.score;
        document.getElementById('level').innerText = `Уровень ${this.level}`;
        document.getElementById('lines').innerText = `Линии ${this.lines}`;
    }

    updateStatus(msg) {
        document.getElementById('gameStatus').innerText = msg;
    }

    setupEventListeners() {
        document.addEventListener('keydown', e => {
            if (e.key === 'ArrowLeft') this.move(-1);
            if (e.key === 'ArrowRight') this.move(1);
            if (e.key === 'ArrowDown') this.drop();
            if (e.key === 'ArrowUp') this.rotatePiece();
            if (e.key === ' ') { e.preventDefault(); while(!this.collide()){ this.currentPiece.pos.y++ } this.currentPiece.pos.y--; this.drop(); }
            if (e.key.toLowerCase() === 'p') this.pauseGame();
        });

        document.getElementById('startBtn').onclick = () => this.startGame();
        document.getElementById('pauseBtn').onclick = () => this.pauseGame();
        document.getElementById('newGameBtn').onclick = () => { this.reset(); this.draw(); this.updateStatus("Готов"); };
    }

    move(dir) {
        if (!this.isRunning || this.isPaused) return;
        this.currentPiece.pos.x += dir;
        if (this.collide()) this.currentPiece.pos.x -= dir;
        this.draw();
    }

    startGame() {
        if (this.isRunning) return;
        if (this.gameOver) this.reset();
        this.isRunning = true;
        this.currentPiece = this.currentPiece || this.createPiece();
        this.updateStatus("Игра идет...");
        document.getElementById('pauseBtn').disabled = false;
        this.update();
    }

    pauseGame() {
        this.isPaused = !this.isPaused;
        this.updateStatus(this.isPaused ? "ПАУЗА" : "Игра идет...");
    }

    update(time = 0) {
        if (this.isRunning && !this.isPaused && !this.gameOver) {
            const deltaTime = time - this.lastUpdate;
            if (deltaTime > (1000 - (this.level * 50))) {
                this.drop();
                this.lastUpdate = time;
            }
            requestAnimationFrame(this.update.bind(this));
        }
    }

    loadHighScore() { document.getElementById('highScore').innerText = this.highScore; }
    saveHighScore() { if(this.score > this.highScore) { localStorage.setItem('tetrisHighScore', this.score); } }
}

const game = new Tetris();
