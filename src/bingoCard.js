class BingoCard {
    static ranges = {
        B: [1, 15],
        I: [16, 30],
        N: [31, 45],
        G: [46, 60],
        O: [61, 75],
    }
    static UserScene = Object.freeze({
        LOADING: 'blank',
        READY: 'ready',
        TRANSITION: 'transition',
    });
    static STORAGE_KEY = "userData";
    constructor() {
        this._seed = null;
        this._tick = 0;
        this._transition = 0;
        this._transitionSpeed = 0.01;
        this._previousScene = null;
        this._nextScene = null;
        this._scene = BingoCard.UserScene.LOADING;
        this._preferences = {
            theme: getSystemTheme(),
            notifications: true,
        }
        this._ui = {
            toggleTheme: { bounds: { x: -100, y: -100, w: -100, h: -100 }, isHover: false },
            toggleFullscreen: { bounds: { x: -100, y: -100, w: -100, h: -100 }, isHover: false },
            newCard: { bounds: { x: -100, y: -100, w: -100, h: -100 }, isHover: false },
        }

        this._card = null;

        this._cellBounds = null;
    }

    get preferences() { return this._preferences; }

    async load() {
        const raw = localStorage.getItem(BingoCard.STORAGE_KEY);
        if (!raw) {
            this._setScene(BingoCard.UserScene.READY);
            this._generateBingoCard(this._seed);
            return;
        }
        const data = JSON.parse(raw);

        this._preferences = data.preferences ?? this._preferences;
        this._card = data.card ?? this._card;
        this._seed = data.seed ?? this._seed;
        if (!this._card) {
            this._generateBingoCard(this._seed);
        }
        applyTheme(this._preferences.theme);
        this._setScene(BingoCard.UserScene.READY);
    }

    async save() {
        localStorage.setItem(
            BingoCard.STORAGE_KEY,
            JSON.stringify(
                {
                    preferences: this._preferences,
                    card: this._card,
                    seed: this._seed,
                }
            )
        );
    }

    draw() {
        push();
        background(getCSSVariable('--background'));
        if (this._scene === BingoCard.UserScene.TRANSITION) {
            this._updateTransition();
            this._drawTransition();
        } else {
            this._drawSceneContent(this._scene);
        }
        this._tick++;
        pop();
    }

    _setScene(scene) {
        this._scene = scene;
        this._tick = 0;
        this._transition = 0;
        this._nextScene = null;
        this._previousScene = null;
    }

    _transitionTo(scene) {
        if (this._scene === UserData.UserScene.TRANSITION) return;
        if (scene === this._scene) return;

        this._previousScene = this._scene;
        this._nextScene = scene;
        this._scene = UserData.UserScene.TRANSITION;
        this._transition = 0;
    }

    _updateTransition() {
        this._transition += this._transitionSpeed;
        if (this._transition >= 1) {
            this._setScene(this._nextScene);
        }
    }

    _drawSceneContent(scene) {
        switch (scene) {
            case BingoCard.UserScene.LOADING:
                this._centerText(strings.get("loading_user_data"));
                break;
            case BingoCard.UserScene.READY:
                this._drawMainScreen();
                break;
        }
    }

    _drawTransition() {
        const c = color(getCSSVariable('--background'));
        if (this._transition < 0.5) {
            this._drawSceneContent(this._previousScene);
            const alpha = map(this._transition, 0, 0.5, 0, 255);
            c.setAlpha(alpha)
            fill(c);
        }
        else {
            this._drawSceneContent(this._nextScene);
            const alpha = max(map(this._transition, 0.5, 1, 255, 0), 0);
            c.setAlpha(alpha)
            fill(c);
        }
        rect(0, 0, width, height);
    }

    _centerText(txt) {
        fill(getCSSVariable('--on-background'));
        textAlign(CENTER, CENTER);
        textSize(28);
        text(txt, width / 2, height / 2);
    }

    _drawMainScreen() {
        push();
        textFont(materialFont);
        const icon = document.body.className === DARK ? "light_mode" : "dark_mode";
        this._ui.toggleTheme = drawButton(width - 30, 30, 40, 40, icon);
        this._ui.toggleFullscreen = drawButton(width - 90, 30, 40, 40, "fit_screen")
        this._ui.newCard = drawButton(30, 30, 40, 40, "casino");
        pop();
        this._drawBingoCard();
    }

    touchStarted(pos_x, pos_y) {
        if (this._scene != BingoCard.UserScene.READY) return;
        userStartAudio();
        if (this._sfx?.toggle) {
            sfx.stop();
            sfx.play();
        }
        if (pointInRect(pos_x, pos_y, this._ui.toggleTheme.bounds)) toggleTheme();
        if (pointInRect(pos_x, pos_y, this._ui.toggleFullscreen.bounds)) toggleFullscreen();
        if (pointInRect(pos_x, pos_y, this._ui.newCard.bounds)) {
            this._seed = this._createSeed()
            this._generateBingoCard(this._seed);
            return;
        }
        this._toggleCellAt(pos_x, pos_y);
    }

    _drawBingoCard() {
        if (!this._card) return;
        const size = min(width, height) * 0.75;
        const cell = size / 5;
        const x0 = (width - size) / 2;
        const y0 = (height - size) / 2 + 30 + cell * 0.6;

        const letters = Object.keys(BingoCard.ranges);

        textAlign(CENTER, CENTER);
        stroke(getCSSVariable('--outline'));
        strokeWeight(2);

        textSize(cell * 0.5);
        fill(getCSSVariable('--on-background'));

        for (let col = 0; col < 5; col++) {
            text(
                letters[col],
                x0 + col * cell + cell / 2,
                y0 - cell * 0.6
            );
        }
        
        textSize(cell * 0.35);
        this._cellBounds = [];

        for (let col = 0; col < 5; col++) {
            const letter = letters[col];
            this._cellBounds[col] = [];

            for (let row = 0; row < 5; row++) {
                const x = x0 + col * cell;
                const y = y0 + row * cell;
                const cellData = this._card[letter][row];

                fill(cellData.checked ? getCSSVariable('--primary') : getCSSVariable('--surface'));
                rect(x, y, cell, cell, 8);
                fill(cellData.checked ? getCSSVariable('--on-primary') : getCSSVariable('--on-surface'));
                text(cellData.value, x + cell / 2, y + cell / 2);

                this._cellBounds[col][row] = { x, y, w: cell, h: cell };
            }
        }
        this._drawSeed(x0, y0 + size + cell * 0.6);
    }

    _drawSeed(x, y) {
        if (!this._seed) return;
        textAlign(LEFT, CENTER);
        textSize(12);
        fill(getCSSVariable('--on-background'));
        noStroke();
        text(`${this._seed}`, x, y);
    }

    _generateBingoCard(seed = null) {
        this._seed = seed ?? this._createSeed();
        randomSeed(this._seed);

        const pickUnique = (min, max, count) => {
            const pool = [];
            for (let i = min; i <= max; i++) pool.push(i);
            shuffle(pool, true);
            return pool.slice(0, count);
        };

        const card = {};
        for (const [letter, [min, max]] of Object.entries(BingoCard.ranges)) {
            const values = pickUnique(min, max, 5);
            card[letter] = values.map(v => ({ value: v, checked: false }));
        }

        card.N[2] = { value: 'FREE', checked: true };

        this._card = card;
        this.save();
    }

    _toggleCellAt(x, y) {
        if (!this._cellBounds) return;
        const letters = Object.keys(BingoCard.ranges);

        for (let col = 0; col < 5; col++) {
            for (let row = 0; row < 5; row++) {
                const b = this._cellBounds[col][row];
                if (pointInRect(x, y, b)) {
                    const cell = this._card[letters[col]][row];
                    if (cell.value === 'FREE') return;
                    cell.checked = !cell.checked;
                    this.save();
                    return;
                }
            }
        }
    }
    _createSeed() {
        return Math.floor(Math.random() * 1_000_000_000);
    }
}