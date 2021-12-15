class Drum {
    constructor({ ctx, x, y, w, h, values = [] }) {
      this.x = x; this.w = w;
      this.y = y; this.h = h;
      this.ctx = ctx;
      this.isStopped = true;
      
      this._values = values;
      this._seekValue = 0;
      this._valueOffsetY = 0;
      this._currentDeg = 0;
      this._degFromOneValue = 360 / this._values.length;
    }
    
    get currentValue() {
      return this._values[this._seekValue];
    }
    get nextValue() {
      if (this._seekValue + 1 >= this._values.length) return this._values[0];
      
      return this._values[this._seekValue + 1];
    }
    
    setting(opts = {}) {
      for (let prop in opts) {
        if (typeof this[prop] === "function" || !(prop in this)) continue;
        
        this[prop] = opts[prop];
      }
      
      return this;
    }
    
    draw() {
      this.ctx.save();
      this.ctx.rect(this.x, this.y, this.w, this.h);
      this.ctx.stroke();
      
      this.ctx.clip();
      this._drawValue();
      this.ctx.restore();
      
      return this;
    }
    
    turn(countSide) {
      if (countSide < 0) return this;
      
      this._currentDeg = 0;
      
      let deg = countSide * this._degFromOneValue;
      if ((this._currentDeg += deg) >= 360) {
        this._currentDeg = this._currentDeg % 360;
      }
      
      this._seekValue = ~~(this._currentDeg / this._degFromOneValue);
      this._valueOffsetY = this.h / this._degFromOneValue * this._currentDeg;
      
      if (this._currentDeg >= this._degFromOneValue) {
        this._valueOffsetY -= (this.h * this._seekValue);
      }
      
      return this;
    }
    
    _drawValue(isFill) {
      const valueOpts = {
        isFill: this.isStopped,
        maxWidth: this.w,
        text: this.currentValue,
        x: this.x + this.w/2,
        y: this.y + this.h/2 + this.h*0.075 + this._valueOffsetY
      };
      
      this._showText(valueOpts);
      
      valueOpts.text = this.nextValue;
      valueOpts.y -= this.h;
      
      this._showText(valueOpts);
    }
    
    _showText({ text, x, y, maxWidth, isFill = true } = {}) {
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.font = `bold ${this.h}px monospace`;
      this.ctx.shadowColor="red";
      this.ctx.shadowBlur=15;
      this.ctx.lineWidth=5;
      
      this.ctx.strokeText(text, x, y, maxWidth);
      
      if (isFill) {
        this.ctx.shadowBlur=0;
        this.ctx.fillStyle="red";
        this.ctx.fillText(text, x, y, maxWidth);
      }
    }
  }
  class Animation
  {
    constructor() {
      this.collection = [];
      this.isAnimate = false;
      
      this.collectionFinal = [];
    }
    
    start() {
      this.isAnimate = true;
      
      requestAnimationFrame((time) => {
        for (let ind in this.collection) {
          this.collection.splice(0, 1)[0](time);
        }
        
        if (this.collection.length > 0) this.start();
        else this._final();
      });
      
      return this;
    }
    
    add({ cb, duration, timing = 'linear' } = {}) {
      if (typeof cb !== "function") return false;
      
      const props = arguments[0];
      props.pivotPtBezier = this._getPivotPtBezier(timing);
      props.start = performance.now();
      
      this.collection.push((timestamp) => this._stepFrame(timestamp, props));
      
      return this;
    }
    
    execAtEnd(cb) {
      if (typeof cb !== "function") return false;
      
      this.collectionFinal.push(cb);
      return this;
    }
    
    _final() {
      this.isAnimate = false;
      
      for (let cb of this.collectionFinal) cb();
      
      this.collectionFinal = [];
    }
    
    _stepFrame(timestamp, props = {}) {
      let currentTime = timestamp - props.start;
  
      if (currentTime < 0) currentTime = 0;
      else if (currentTime > props.duration) currentTime = props.duration;
  
      let validTime = this._getPercentTime(props.duration, currentTime) / 100;
      let pointBezier = this._getPointBezier(props.pivotPtBezier, validTime);
  
      const currentProgression = pointBezier[1];
  
      props.cb(currentProgression);
  
      if (currentTime < props.duration) {
        this.collection.push((timestamp) => this._stepFrame(timestamp, props));
      }
    }
    
    _getPivotPtBezier(timing) {
      if (Array.isArray(timing)) return timing;
      
      switch(timing) {
        case 'ease-in': return [[0, 0], [.42, 0], [1, 1], [1, 1]];
        case 'ease-out': return [[0, 0], [0, 0], [.58, 1], [1, 1]];
        case 'ease-in-out': return [[0, 0], [0, 0], [.58, 1], [1, 1]];
  
        default: return [[0, 0], [1, 1]];
      }
    }
    
    _getPercentTime(fullTime, currentTime) {
      return currentTime / fullTime * 100;
    }
    
    _getPointBezier(points = [], time = 0) {
      if (points.length < 2) return points;
      const interPts = [];
  
      for (let i = 1; i < points.length; i++) {
        let p1 = points[i - 1];
        let p2 = points[i];
        let percent = time * 100;
  
        interPts.push(this._getPointOnVecByPercent(p1, p2, percent));
      }
  
      return interPts.length > 1 ? this._getPointBezier(interPts, time) : interPts[0];
    }
    
    _getLenVec([ x1, y1 ], [ x2, y2 ]) {
      return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
    }
    
    _getDistanceCovered(fullDistance, percentCovered) {
      return fullDistance / 100 * percentCovered;
    }
    
    _getPointOnVecByPercent([ x1, y1 ], [ x2, y2 ], percent) {
      let lenVec = this._getLenVec([ x1, y1 ], [ x2, y2 ]);
      let distanceCovered = this._getDistanceCovered(lenVec, percent);
  
      let k = (distanceCovered / lenVec) || 0;
  
      let x = x1 + (x2 - x1) * k;
      let y = y1 + (y2 - y1) * k;
  
      return [ x, y ];
    }
  }
const canvasUI = {
    start: document.querySelector('.btn--start'),
    cashAmount: document.getElementById('cashAmount'),
    betAmount: document.getElementById('betAmount'),
  };
  let values = [];
  for (let i = 0; i <= 7; i++) values.push(i);
  const GAME = {
    defCash: 100,
    bet: 10,
    values,
    random: []
  };
  GAME.cash = GAME.defCash;
  const canva = document.getElementById('canva');
  const ctx = canva.getContext('2d');
  canvasUI.cashAmount.innerHTML = GAME.cash;
  canvasUI.betAmount.innerHTML = GAME.bet;
  refreshRender();
  
  window.onresize = refreshRender;
  
  function refreshRender() {
    setDisplayCanvas();
    setDisplayCanvasUI();
    computePosElems();
    renderCanvas();
  }
  function setDisplayCanvas() { 
    canva.width = canva.parentNode.clientWidth;
    canva.height = canva.width * 3/4;
  }
  function setDisplayCanvasUI() {
    let btnStartFSize = canva.width / 25;
    canvasUI.start.style.fontSize = btnStartFSize + 'px';
    canvasUI.start.style.padding = `${btnStartFSize/4}px ${btnStartFSize}px`;
    canvasUI.start.style.left = canva.width / 2 - canvasUI.start.clientWidth / 2 + 'px';
  }
  function renderCanvas() {
    canva.width = canva.parentNode.clientWidth;
    
    for (let drum = 1; drum <= 3; drum++) {
      GAME[`drum${drum}`].draw();
    }
  }
  function computePosElems() {
    const { width, height } = canva;
    
    computeDrums(width, height);
  }
  function computeDrums(width, height) {
    const drumOpts = {
      w: width*0.25, h: height*0.35,
      values: GAME.values,
      ctx
    };
    drumOpts.x = width*0.25 / 2;
    drumOpts.y = height*0.2 + canvasUI.start.clientHeight / 2;
    
    GAME.drum1 = GAME.drum1 ? GAME.drum1.setting(drumOpts) : new Drum(drumOpts);
    drumOpts.x += drumOpts.w;
    GAME.drum2 = GAME.drum2 ? GAME.drum2.setting(drumOpts) : new Drum(drumOpts);
    drumOpts.x += drumOpts.w;
    GAME.drum3 = GAME.drum3 ? GAME.drum3.setting(drumOpts) : new Drum(drumOpts);
  }
  canvasUI.start.onclick = () => {
    canvasUI.start.disabled = true;
    if (GAME.cash == 0) GAME.cash = GAME.defCash;
    
    GAME.cash -= GAME.bet;
    (new Animation()).add({
      duration: 800, cb: changeCashByProgress
    }).start();
    
    const Anim = new Animation();
    let duration = 0;
    let step = 1500;
    
    for (let i = 1; i <= 3; i++) {
      GAME.random[i - 1] = ~~(Math.random() * GAME.values.length) + GAME.values.length*i;
      duration += step;
      step *= .9;
      
      Anim.add({ duration, timing: 'ease-out',
        cb: (progress) => {
          let currentTurn = GAME.random[i - 1] * progress;
          GAME[`drum${i}`].turn(currentTurn);
          
          if (progress > .99) GAME[`drum${i}`].isStopped = true;
          else GAME[`drum${i}`].isStopped = false;
        }
      });
    }
    
    Anim.add({
      duration, cb: renderCanvas
    }).execAtEnd(() => {
      const combo = [];
      for (let i = 1; i <= 3; i++) {
        combo.push(GAME[`drum${i}`].currentValue);
      }
      
      GAME.cash += getWinnnings(combo);
      (new Animation()).add({
        duration: 800, cb: changeCashByProgress
      }).start();
      
      canvasUI.start.disabled = false;
    }).start();
  };
  
  function changeCashByProgress(progress) {
    if (progress <= .5) {
      canvasUI.cashAmount.style.opacity = 1 - progress * 2;
    }
    else {
      canvasUI.cashAmount.innerHTML = GAME.cash;
      canvasUI.cashAmount.style.opacity = progress * 2 - 1;
    }
  }
  
  function getWinnnings(combo = [], bet = 10) {
    const res = checkCombo(combo);
    let defRes = 0;
    // user faild
    if (res.weight < 1) return defRes;
  
    const winnnings = {
      '1': { '7': 10 },
      '2': {
        '1': 100, '2': 200, '3': 300, '4': 400,
        '5': 500, '6': 750, '7': 1000
      },
      '3': {
        '1': 2500, '2': 5000, '3': 15000, '4': 25000,
        '5': 50000, '6': 75000, '7': 1000000
      }
    };
    
    if (winnnings[res.weight] && winnnings[res.weight][res.val]) {
      return winnnings[res.weight][res.val] * bet * .1;
    }
    
    return defRes;
  }
  function checkCombo(combo = []) {
    const res = { weight: 0 };
    if (combo[0] === combo[1] && combo[1] === combo[2]) {
      res.val = combo[1];
      res.weight = 3;
    }
    else if (combo[0] === combo[1] || combo[1] === combo[2]) {
      res.val = combo[1];
      res.weight = 2;
    }
    else if ( combo.some((val) => val === 7) ) {
      res.val = 7;
      res.weight = 1;
    }
    return res;
  }
  