class Tetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.cols = 10;
        this.rows = 20;
        this.cellSize = 30;
        
        this.colors = [
            null,
            '#FF3232', // T
            '#32FFFF', // I
            '#32FF32', // S
            '#FF32FF', // Z
            '#FF9632', // L
            '#FFFF32', // O
            '#3264FF'  // J
        ];
        
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
        this.updateScoreUI();
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
        this.lastTime = 0;
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

    // Поворот матрицы
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
        
        // Wall Kick: пробуем подвинуть фигуру, если она застряла в стене при повороте
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
                    let bY = y + o.y;
                    let bX = x + o.x;
                    // Проверка границ и занятых клеток
                    if (bX < 0 || bX >= this.cols || bY >= this.rows || (bY >= 0 && this.board[bY][bX] !== 0)) {
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
        this.draw();
    }

    merge() {
        this.currentPiece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const bY = y + this.currentPiece.pos.y;
                    if (bY >= 0) this.board[bY][x + this.currentPiece.pos.x] = value;
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
            }
            this.updateStatus("ИГРА ОКОНЧЕНА");
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
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Отрисовка сетки
        this.ctx.strokeStyle = '#111';
        for(let i=0; i<this.cols; i++) this.ctx.strokeRect(i*this.cellSize, 0, 0.1, this.canvas.height);
        for(let i=0; i<this.rows; i++) this.ctx.strokeRect(0, i*this.cellSize, this.canvas.width, 0.1);

        this.drawMatrix(this.board, {x: 0, y: 0}, this.ctx);
        if (this.currentPiece) this.drawMatrix(this.currentPiece.matrix, this.currentPiece.pos, this.ctx);

        // Превью следующей фигуры
        this.nextCtx.fillStyle = '#1a262f';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        this.drawMatrix(this.nextPiece.matrix, {x: 1, y: 1}, this.nextCtx, 20);
    }

    drawMatrix(matrix, offset, ctx, size = 30) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = this.colors[value];
                    ctx.fillRect((x + offset.x) * size, (y + offset.y) * size, size - 1, size - 1);
                    // Эффект объема
                    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                    ctx.strokeRect((x + offset.x) * size, (y + offset.y) * size, size - 1, size - 1);
                }
            });
        });
    }

    setupListeners() {
        const handleAction = (action) => {
            if (!this.isRunning || this.isPaused || this.gameOver) return;
            if (action === 'left') this.move(-1);
            if (action === 'right') this.move(1);
            if (action === 'down') this.drop();
            if (action === 'rotate') this.rotatePiece();
            if (action === 'drop') { 
                while(!this.collide()){ this.currentPiece.pos.y++ } 
                this.currentPiece.pos.y--; 
                this.drop(); 
            }
        };

        // ПК события
        document.addEventListener('keydown', e => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
            if (e.key === 'ArrowLeft') handleAction('left');
            if (e.key === 'ArrowRight') handleAction('right');
            if (e.key === 'ArrowDown') handleAction('down');
            if (e.key === 'ArrowUp') handleAction('rotate');
            if (e.key === ' ') handleAction('drop');
            if (e.key.toLowerCase() === 'p') this.togglePause();
        });

        // Мобильные события (PointerEvents поддерживают и мышь и тач)
        const bind = (id, action) => {
            const el = document.getElementById(id);
            el.addEventListener('pointerdown', (e) => { e.preventDefault(); handleAction(action); });
        };
        bind('leftBtn', 'left'); bind('rightBtn', 'right'); bind('downBtn', 'down'); bind('rotateBtn', 'rotate'); bind('dropBtn', 'drop');

        document.getElementById('startBtn').onclick = () => this.start();
        document.getElementById('pauseBtn').onclick = () => this.togglePause();
        document.getElementById('newGameBtn').onclick = () => { this.reset(); this.draw(); this.updateStatus("Новая игра"); };
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
        if (this.gameOver) this.reset();
        this.isRunning = true;
        this.currentPiece = this.currentPiece || this.createPiece();
        document.getElementById('pauseBtn').disabled = false;
        this.updateStatus("ИГРА");
        this.run();
    }

    run(time = 0) {
        if (this.isRunning && !this.isPaused && !this.gameOver) {
            const dt = time - this.lastTime;
            if (dt > (1000 - (this.level * 70))) {
                this.drop();
                this.lastTime = time;
            }
            requestAnimationFrame(t => this.run(t));
        }
    }

    updateScoreUI() {
        document.getElementById('currentScore').innerText = this.score;
        document.getElementById('level').innerText = `Уровень ${this.level}`;
        document.getElementById('lines').innerText = `Линии: ${this.lines}`;
        document.getElementById('highScore').innerText = this.highScore;
    }
    updateStatus(msg) { document.getElementById('gameStatus').innerText = msg; }
}

// Запуск
new Tetris();
