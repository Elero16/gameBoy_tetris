class Tetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.cols = 10;
        this.rows = 20;
        this.cellSize = 30;
        
        this.colors = {
            dark: '#02080a',
            grid: '#0d222b',
            pieces: [
                null,
                '#FF3232', // T
                '#32FFFF', // I
                '#32FF32', // S
                '#FF32FF', // Z
                '#FF9632', // L
                '#FFFF32', // O
                '#3264FF'  // J
            ]
        };
        
        this.shapes = {
            'T': [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
            'I': [[0, 2, 0, 0], [0, 2, 0, 0], [0, 2, 0, 0], [0, 2, 0, 0]],
            'S': [[0, 3, 3], [3, 3, 0], [0, 0, 0]],
            'Z': [[4, 4, 0], [0, 4, 4], [0, 0, 0]],
            'L': [[0, 5, 0], [0, 5, 0], [0, 5, 5]],
            'O': [[6, 6], [6, 6]],
            'J': [[0, 7, 0], [0, 7, 0], [7, 7, 0]]
        };
        
        this.highScore = localStorage.getItem('tetrisHighScore') || 0;
        this.reset();
        this.setupListeners();
        this.loadHighScore();
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
        this.updateScoreUI();
    }

    createPiece() {
        const types = Object.keys(this.shapes);
        const type = types[Math.floor(Math.random() * types.length)];
        const matrix = this.shapes[type];
        return {
            matrix: JSON.parse(JSON.stringify(matrix)),
            pos: { x: Math.floor(this.cols / 2) - Math.floor(matrix[0].length / 2), y: 0 }
        };
    }

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
        const oldMatrix = JSON.parse(JSON.stringify(this.currentPiece.matrix));
        this.rotate(this.currentPiece.matrix);
        
        let offset = 1;
        const pos = this.currentPiece.pos.x;
        while (this.collide()) {
            this.currentPiece.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.currentPiece.matrix[0].length) {
                this.currentPiece.matrix = oldMatrix;
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
                if (m[y][x] !== 0) {
                    let boardY = y + o.y;
                    let boardX = x + o.x;
                    if (boardX < 0 || boardX >= this.cols || boardY >= this.rows || (boardY >= 0 && this.board[boardY][boardX] !== 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    drop() {
        if (!this.isRunning || this.isPaused) return;
        this.currentPiece.pos.y++;
        if (this.collide()) {
            this.currentPiece.pos.y--;
            this.merge();
            this.resetPiece();
            this.sweep();
        }
        this.lastUpdate = performance.now();
        this.draw();
    }

    merge() {
        this.currentPiece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const boardY = y + this.currentPiece.pos.y;
                    if (boardY >= 0) this.board[boardY][x + this.currentPiece.pos.x] = value;
                }
            });
        });
    }

    resetPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.createPiece();
        if (this.collide()) {
            this.gameOver = true;
            this.isRunning = false;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('tetrisHighScore', this.highScore);
                this.loadHighScore();
            }
            this.updateStatus("GAME OVER");
        }
    }

    sweep() {
        let rowsCleared = 0;
        outer: for (let y = this.board.length - 1; y >= 0; --y) {
            for (let x = 0; x < this.board[y].length; ++x) {
                if (this.board[y][x] === 0) continue outer;
            }
            const row = this.board.splice(y, 1)[0].fill(0);
            this.board.unshift(row);
            ++y;
            rowsCleared++;
        }
        if (rowsCleared > 0) {
            this.score += rowsCleared * 100 * this.level;
            this.lines += rowsCleared;
            this.level = Math.floor(this.lines / 10) + 1;
            this.updateScoreUI();
        }
    }

    draw() {
        // Очистка
        this.ctx.fillStyle = this.colors.dark;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Сетка
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 0.5;
        for(let i=0; i<this.cols; i++) this.ctx.strokeRect(i*this.cellSize, 0, 0.1, this.canvas.height);
        for(let i=0; i<this.rows; i++) this.ctx.strokeRect(0, i*this.cellSize, this.canvas.width, 0.1);

        this.drawMatrix(this.board, {x: 0, y: 0}, this.ctx);
        if (this.currentPiece) this.drawMatrix(this.currentPiece.matrix, this.currentPiece.pos, this.ctx);

        // Следующая фигура
        this.nextCtx.fillStyle = this.colors.dark;
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        this.drawMatrix(this.nextPiece.matrix, {x: 1, y: 1}, this.nextCtx);
    }

    drawMatrix(matrix, offset, ctx) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = this.colors.pieces[value];
                    ctx.fillRect((x + offset.x) * this.cellSize, (y + offset.y) * this.cellSize, this.cellSize - 1, this.cellSize - 1);
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.strokeRect((x + offset.x) * this.cellSize, (y + offset.y) * this.cellSize, this.cellSize - 1, this.cellSize - 1);
                }
            });
        });
    }

    setupListeners() {
        const handleAction = (action) => {
            if (!this.isRunning || this.isPaused) return;
            if (action === 'left') this.move(-1);
            if (action === 'right') this.move(1);
            if (action === 'down') this.drop();
            if (action === 'rotate') this.rotatePiece();
            if (action === 'drop') { while(!this.collide()){ this.currentPiece.pos.y++ } this.currentPiece.pos.y--; this.drop(); }
        };

        // Keyboard
        document.addEventListener('keydown', e => {
            if (e.key === 'ArrowLeft') handleAction('left');
            if (e.key === 'ArrowRight') handleAction('right');
            if (e.key === 'ArrowDown') handleAction('down');
            if (e.key === 'ArrowUp') handleAction('rotate');
            if (e.key === ' ') { e.preventDefault(); handleAction('drop'); }
            if (e.key.toLowerCase() === 'p') this.togglePause();
        });

        // Mobile / Mouse
        const bind = (id, action) => {
            const el = document.getElementById(id);
            ['mousedown', 'touchstart'].forEach(ev => el.addEventListener(ev, (e) => { e.preventDefault(); handleAction(action); }));
        };
        bind('leftBtn', 'left'); bind('rightBtn', 'right'); bind('downBtn', 'down'); bind('rotateBtn', 'rotate'); bind('dropBtn', 'drop');

        document.getElementById('startBtn').onclick = () => this.start();
        document.getElementById('pauseBtn').onclick = () => this.togglePause();
        document.getElementById('newGameBtn').onclick = () => { this.reset(); this.draw(); };
    }

    move(dir) {
        this.currentPiece.pos.x += dir;
        if (this.collide()) this.currentPiece.pos.x -= dir;
        this.draw();
    }

    togglePause() {
        if (!this.isRunning || this.gameOver) return;
        this.isPaused = !this.isPaused;
        this.updateStatus(this.isPaused ? "ПАУЗА" : "ИГРА");
    }

    start() {
        if (this.isRunning) return;
        this.reset();
        this.isRunning = true;
        this.currentPiece = this.createPiece();
        this.nextPiece = this.createPiece();
        document.getElementById('pauseBtn').disabled = false;
        this.updateStatus("ИГРА");
        this.run();
    }

    run(time = 0) {
        if (this.isRunning && !this.isPaused && !this.gameOver) {
            const dt = time - this.lastTime;
            if (dt > (1000 - (this.level * 60))) {
                this.drop();
                this.lastTime = time;
            }
            requestAnimationFrame(t => this.run(t));
        }
    }

    updateScoreUI() {
        document.getElementById('currentScore').innerText = this.score;
        document.getElementById('level').innerText = `Уровень ${this.level}`;
        document.getElementById('lines').innerText = `Линии ${this.lines}`;
    }
    loadHighScore() { document.getElementById('highScore').innerText = this.highScore; }
    updateStatus(msg) { document.getElementById('gameStatus').innerText = msg; }
}

new Tetris();
