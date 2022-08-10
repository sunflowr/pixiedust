export const UIEventTypes = {
  usedEvent: Symbol("usedEvent"),
  layoutEvent: Symbol("layoutEvent"),
  mouseDownEvent: Symbol("mouseDownEvent"),
  mouseUpEvent: Symbol("mouseUpEvent"),
  mouseMoveEvent: Symbol("mouseMoveEvent"),
  mouseDragEvent: Symbol("mouseDragEvent"),
  drawEvent: Symbol("drawEvent")
};
Object.freeze(UIEventTypes);

export class UIEvent {
  constructor(type, data) {
    this._type = type;
    this._data = data;
  }

  get type() {
    return this._type;
  }

  get data() {
    return this._data;
  }

  use() {
    this._type = UIEventTypes.usedEvent;
  }
}

export class Rect {
  constructor(x, y, width, height) {
    if (x instanceof Rect) {
      this.x = x.x;
      this.y = x.y;
      this.width = x.width;
      this.height = x.height;
    } else if (x instanceof Object) {
      this.x = x.x;
      this.y = x.y;
      this.width = x.width;
      this.height = x.height;
    } else if ((!isNaN(x)) &&
      (!isNaN(y)) &&
      (!isNaN(width)) &&
      (!isNaN(height))) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    } else {
      throw new TypeError("Arugment is of wrong type");
    }
  }

  get top() { return this.y; }
  get bottom() { return this.y + this.height; }
  get left() { return this.x; }
  get right() { return this.x + this.width; }

  copy() {
    return new Rect(this.x, this.y, this.width, this.height);
  }

  shrink(x, y) {
    return new Rect(this.x + x, this.y + y, this.width - x, this.height - x);
  }

  expand(x, y) {
    return new Rect(this.x - x, this.y - y, this.width + x, this.height + x);
  }

  inside(x, y) {
    if (x instanceof Object) {
      y = x.y;
      x = x.x;
    }
    return (x >= this.left) && (x <= this.right) && (y >= this.top) && (y <= this.bottom);
  }
}

export class UI {
  static instance = new UI();
  static get currentEvent() {
    return UI.instance.currentEvent;
  }

  static getId(content, rect) {
    return UI.instance.getId(content, rect);
  }

  constructor() {
    this.ctx = null;

    this.viewport = new Rect(0, 0, 0, 0);

    this._content = [];
    this._currentId = -1;
    this._hoverId = -1;
    this._cursorPos = { x: -100, y: -100 };
    this._mouseButton = 0;
    this._mouseCursor = "default";
    this._eventQueue = [];
    this.addEvent(new UIEvent(UIEventTypes.layoutEvent, {}));     // layoutEvent
    //this.addEvent(new UIEvent(UIEventTypes.mouseDownEvent, {}));  // mouseDownEvent
    //this.addEvent(new UIEvent(UIEventTypes.mouseUpEvent, {}));    // mouseUpEvent
    //this.addEvent(new UIEvent(UIEventTypes.mouseMoveEvent, {}));  // mouseMoveEvent
    //this.addEvent(new UIEvent(UIEventTypes.mouseDragEvent, {}));  // mouseDragEvent
    this.addEvent(new UIEvent(UIEventTypes.drawEvent, {}));       // drawEvent

    // Style.
    this.styles = {
      background: "#cdcdcd",
      scrollbar: {
        background: {
          fill: "#303030"
        },
        handle: {
          fill: "#ffffff",
          hover: {
            fill: "#ee70aa",
            stroke: "#ee70aa",
            strokeWidth: 1
          }
        }
      },
      splitter: {
        margin: 1
      },
    };
  }

  get canvasCtx() {
    return this.ctx;
  }

  set canvasCtx(value) {
    this.ctx = value;
  }

  get hasEvents() {
    return this._eventQueue.length > 0;
  }

  get currentEvent() {
    return this.hasEvents ? this._eventQueue[0] : new UIEvent(UIEventTypes.layoutEvent, {});
  }

  set cursorPos(value) {
    const cursorPosDelta = this.viewport.inside(this._cursorPos) ?
      { x: value.x - this._cursorPos.x, y: value.y - this._cursorPos.y } :
      { x: 0, y: 0 };
    this._cursorPos = value;

    if(this._mouseButton === 1) {
      this.addEvent(new UIEvent(UIEventTypes.mouseDragEvent, cursorPosDelta));
    } else {
      this.addEvent(new UIEvent(UIEventTypes.mouseMoveEvent, this._cursorPos));
    }
  }

  set mouseDown(value) {
    this._mouseButton = 1;
    this.addEvent(new UIEvent(UIEventTypes.mouseDownEvent, value));
  }

  set mouseUp(value) {
    this._mouseButton = 0;
    this.addEvent(new UIEvent(UIEventTypes.mouseUpEvent, value));
  }

  get mouseCursor() {
    return this._mouseCursor;
  }

  set mouseCursor(value) {
    this._mouseCursor = value;
  }

  get hotControl() {
    return this._hotControl;
  }

  set hotControl(value) {
    if (this._hotControl !== value) {
      this.addEvent(new UIEvent(UIEventTypes.drawEvent, {}));
    }
    this._hotControl = value;
  }

  // TEMP -----
  get _localCursorPos() {
    const absPos = { x: 0, y: 0 };
    return { x: this._cursorPos.x - absPos.x, y: this._cursorPos.y - absPos.y };
  }
  //-----

  addEvent(event) {
    this._eventQueue = this._eventQueue.filter(x => x.type !== event.type);
    this._eventQueue.push(event);
  }

  resize(width, height) {
    this.viewport.width = width;
    this.viewport.height = height;
    this.addEvent(new UIEvent(UIEventTypes.layoutEvent, {}));
    this.addEvent(new UIEvent(UIEventTypes.drawEvent, {}));
  }

  begin() {
    this._currentId = -1;
    this._mouseCursor = "default";
  }

  update(content) {
    let maxId = -1;
    //const oldHotControl = this.hotControl;
    //this.addEvent(new UIEvent(UIEventTypes.layoutEvent, {}));

    while (this.hasEvents) {
      console.log("update");
      this._currentId = 0;

      content?.(new Rect(this.viewport));

      if (maxId < 0) {
        maxId = this._currentId;
      }
      else if (maxId !== this._currentId) {
        throw new Error("Mismatch in id's between passes.");
      }

      switch (this.currentEvent.type) {
        case UIEventTypes.mouseMoveEvent:
          this._hotControl = -1;
          if (this.hotControl === -1) {
            this.addEvent(new UIEvent(UIEventTypes.drawEvent, {}));
          }
          break;
      }

      // Event processed, remove it.
      this._eventQueue.shift();
    }

  }

  end() {
  }

  /* eslint-disable no-unused-vars */
  getId(content, rect) {
    switch (this.currentEvent) {
      case UIEventTypes.layoutEvent:
        break;
      case UIEventTypes.drawEvent:
        break;
    }
    return this._currentId++;
  }
  /* eslint-enable no-unused-vars */

  // ui functions -------------------------------------------------------------
  doButton(id, rect, content, style) {
    return this.doControl(id, rect, content, style, rect.inside(this._localCursorPos), false);
  }

  doControl(id, rect, content, style, hover, state) {
    switch (this.currentEvent) {
      case UIEventTypes.layoutEvent:
        break;

      case UIEventTypes.mouseMoveEvent:
        if (rect.inside(this._localCursorPos)) {
          this.hotControl = id;
          this.mouseCursor = style.mouseCursor ?? "default";
        }
        break;

      case UIEventTypes.drawEvent:
        style.draw(this, id, rect, content, hover, state);
        break;

      case UIEventTypes.mouseDownEvent:
        break;

      case UIEventTypes.mouseUpEvent:
        break;
    }
    return state;
  }

  horizontalSplit(id, rect, splitY, style, content1, content2) {
    const margin = this.styles.splitter.margin * 2;
    const marginHalf = this.styles.splitter.margin;
    const separator = Math.min(splitY, rect.height);
    this.panel(new Rect({ ...rect, height: separator - marginHalf }), style, content1);
    this.panel(new Rect({ ...rect, y: (rect.y + separator) + marginHalf, height: rect.height - (separator + marginHalf) }), style, content2);
    this._splitter(id, new Rect({ ...rect, y: (rect.y + separator) - marginHalf, height: margin }), { ...this.styles.background, mouseCursor: "row-resize" });
    return splitY;
  }

  verticalSplit(id, rect, splitX, style, content1, content2) {
    const margin = this.styles.splitter.margin * 2;
    const marginHalf = this.styles.splitter.margin;
    const separator = Math.min(splitX, rect.width);
    this.panel(new Rect({ ...rect, width: separator - marginHalf }), style, content1);
    this.panel(new Rect({ ...rect, x: (rect.x + separator) + marginHalf, width: rect.width - (separator + marginHalf) }), style, content2);
    this._splitter(id, new Rect({ ...rect, x: (rect.x + separator) - marginHalf, width: margin }), { ...this.styles.background, mouseCursor: "col-resize" });
    return splitX;
  }

  panel(rect, style, content) {
    this.ctx.save();
    this._drawRect(rect, style);
    this._clipRect(rect);
    content?.(new Rect(rect));
    this.ctx.restore();
  }

  beginGroup(style) {
    // TODO: Fix this.
    let group;
    switch (this.currentEvent.type) {
      case UIEventTypes.usedEvent:
      case UIEventTypes.layoutEvent:
        group = {
          style: style
        };
        this._topLevel.add(group);
        break;

      default:
        group = this._topLevel.next();
        group.reset();
    }
    this._layoutGroups.push(group);
    this._topLevel = group;
    return group;
  }

  endGroup() {
    // TODO: Fix this.
    this._layoutGroups.pop();
    if (this._layoutGroups.length > 0) {
      this._topLevel = this._layoutGroups.peek();//[_layoutGroups.length - 1];
    } else {
      this._topLevel = {};
    }
  }

  beginScrollView(scrollPos, style) {
    const g = this.beginGroup(style);
    this._drawRect(g.rect, style);
    //const id = this.getId();
    scrollPos.x = this.hScroll(new Rect(g.rect), scrollPos.x, g.rect.width, g.rect.left, g.rect.right, style);
    scrollPos.y = this.vScroll(new Rect(g.rect), scrollPos.y, g.rect.height * 2, g.rect.top, g.rect.bottom * 2, style);
    return scrollPos;
  }

  endScrollView() {
    switch (this.currentEvent.type) {
      case UIEventTypes.layoutEvent:
        break;
    }
  }

  scrollView(rect, style, viewRect, state, content) {
    this._drawRect(rect, style);
    const scrollWidth = 10;
    const hScrollVisible = viewRect.width > rect.width;
    const vScrollVisible = viewRect.height > rect.height;
    const contentWidth = ((viewRect.width > rect.width) || vScrollVisible) ? (rect.width + scrollWidth) : rect.width;
    const contentHeight = ((viewRect.height > rect.height) || (hScrollVisible)) ? (rect.height + scrollWidth) : rect.height;

    const contentRect = new Rect(rect.x, rect.y, contentWidth, contentHeight);
    const hScrollRect = new Rect(rect.x, rect.bottom - scrollWidth, rect.width - scrollWidth, scrollWidth);
    const vScrollRect = new Rect(rect.right - scrollWidth, rect.top, scrollWidth, rect.bottom - scrollWidth);

    this.panel(contentRect, style, content);
    if (contentWidth > rect.width) {
      state.x = this.scrollbar(hScrollRect, state.x, viewRect.width, this.styles.background, true);
    }
    if (contentHeight > rect.height) {
      state.y = this.scrollbar(vScrollRect, state.y, viewRect.height, this.styles.background);
    }
    return state;
  }

  scrollbar(rect, value, size, style, horizontal) {
    const id = this.getId();
    const width = (horizontal ? rect.width : rect.height);
    const pixelMult = size / width;
    const visibleRatio = (size - width) / size;
    const scrollWidth = width * (1.0 - visibleRatio);
    const scrollHandleRect = horizontal ?
      new Rect(rect.x + ((value / size)) * width, rect.y, scrollWidth, rect.height) :
      new Rect(rect.x, rect.y + ((value / size)) * width, rect.width, scrollWidth);

    switch (this.currentEvent.type) {
      case UIEventTypes.layoutEvent:
        break;

      case UIEventTypes.mouseMoveEvent:
        if (rect.inside(this._localCursorPos)) {
          this.hotControl = id;
          this.mouseCursor = style.mouseCursor ?? "default";
          this.currentEvent.use();
        }
        break;

      case UIEventTypes.mouseDownEvent:
        if (this.hotControl === id) {
          if (rect.inside(this._localCursorPos)) {
            value = (this._localCursorPos.x - rect.left) * pixelMult;
          }
          this.currentEvent.use();
          this.addEvent(new UIEvent(UIEventTypes.drawEvent, {}));
        }
        break;

        case UIEventTypes.mouseDragEvent:
        if (this.hotControl === id) {
          const movement = (horizontal ? this.currentEvent.data.x : this.currentEvent.data.y)
          if (Math.abs(movement) > 0.01) {
            value += movement * pixelMult;
          }
          value = Math.min(Math.max(0, value), (size - scrollWidth));
          this.currentEvent.use();
          this.addEvent(new UIEvent(UIEventTypes.drawEvent, {}));
        }
        break;

      case UIEventTypes.drawEvent:
        {
          let handleStyle = this.styles.scrollbar.handle;
          let scrollHandleRectDraw = scrollHandleRect;
          if (this.hotControl === id) {
            handleStyle = { ...this.styles.scrollbar.handle, ...this.styles.scrollbar.handle.hover };
            this.mouseCursor = handleStyle.mouseCursor ?? "default";
            scrollHandleRectDraw = scrollHandleRectDraw.shrink(handleStyle.strokeWidth, handleStyle.strokeWidth);
          }
          this.ctx.save();
          this._clipRect(rect);
          this._drawRect(rect, this.styles.scrollbar.background);
          this._drawRect(scrollHandleRectDraw, handleStyle);
          this.ctx.restore();
          break;
        }
    }

    return value;
  }

  button(id, rect, style, content) {
    switch (this.currentEvent.type) {
      case UIEventTypes.layoutEvent:
        break;

      case UIEventTypes.mouseMoveEvent:
        if (rect.inside(this._localCursorPos)) {
          this.hotControl = id;
          this.mouseCursor = style.mouseCursor ?? "default";
          this.currentEvent.use();
        }
        break;

      case UIEventTypes.drawEvent:
        if (this.hotControl === id) {
          style = { ...style };
          style.stroke = "#ffffff";
          style.strokeWidth = 2;
          rect = new Rect(rect);
          rect.x += style.strokeWidth;
          rect.y += style.strokeWidth;
          rect.width -= style.strokeWidth * 2;
          rect.height -= style.strokeWidth * 2;
          this.mouseCursor = style.mouseCursor ?? "default";
        }
        this.ctx.save();
        content?.(new Rect(rect), style);
        this.ctx.restore();
        break;

      case UIEventTypes.mouseDownEvent:
        return this.hotControl === id;
    }

    return false;
  }

  label(id, rect, style, content) {
    switch (this.currentEvent.type) {
      case UIEventTypes.layoutEvent:
        break;

      case UIEventTypes.mouseMoveEvent:
        if (rect.inside(this._localCursorPos)) {
          this.hotControl = id;
          this.mouseCursor = style.mouseCursor ?? "default";
          this.currentEvent.use();
        }
        break;

      case UIEventTypes.drawEvent:
        if (this.hotControl === id) {
          this.mouseCursor = style.mouseCursor ?? "default";
        }
        this.ctx.save();
        content?.(new Rect(rect), style);
        this.ctx.restore();
        break;
    }
  }

  // internal functions -----------------------------------------------------------
  _splitter(id, rect, style) {
    switch (this.currentEvent.type) {
      case UIEventTypes.layoutEvent:
        break;

      case UIEventTypes.mouseMoveEvent:
        if (rect.inside(this._localCursorPos)) {
          this.hotControl = id;
          this.mouseCursor = style.mouseCursor ?? "default";
          this.currentEvent.use();
        }
        break;

      case UIEventTypes.drawEvent: {
        if (this.hotControl === id) {
          style = { ...style };
          style.stroke = "#ffffff";
          style.strokeWidth = 2;
          rect = new Rect(rect);
          rect.x += style.strokeWidth;
          rect.y += style.strokeWidth;
          rect.width -= style.strokeWidth * 2;
          rect.height -= style.strokeWidth * 2;
        }
        this._drawRect(rect, style);
        break;
      }
    }
  }

  _clipRect(rect) {
    if (UI.currentEvent.type !== UIEventTypes.drawEvent) {
      return;
    }

    this.ctx.beginPath();
    this.ctx.rect(rect.x, rect.y, rect.width, rect.height);
    this.ctx.clip();
  }

  _drawLine(from, to, style) {
    if (this.currentEvent.type !== UIEventTypes.drawEvent) {
      return;
    }

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.lineWidth = style.lineWidth ?? 1;
    this.ctx.strokeStyle = style.stroke ?? "#000000";
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  _drawRect(rect, style) {
    if (this.currentEvent.type !== UIEventTypes.drawEvent) {
      return;
    }

    this.ctx.save();
    this.ctx.translate(rect.x, rect.y)
    this.ctx.beginPath();
    if (style.elevation) {
      this.ctx.shadowColor = style.elevationColor ?? "#000000";
      this.ctx.shadowBlur = style.elevation;
    }
    if (style.stroke) {
      this.ctx.lineWidth = style.strokeWidth ?? 2;
      this.ctx.strokeStyle = style.stroke;
    }
    if (style.fill) {
      this.ctx.fillStyle = style.fill;
    }
    this.ctx.rect(0, 0, rect.width, rect.height);
    if (style.fill) {
      this.ctx.fill();
    }
    if (style.stroke) {
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  _drawText(rect, label, style) {
    if (this.currentEvent.type !== UIEventTypes.drawEvent) {
      return;
    }

    // TODO: Clean up.
    this.ctx.save()
    this.ctx.translate(rect.x, rect.y);
    this.ctx.beginPath();
    this.ctx.lineWidth = 2;
    this.ctx.fillStyle = style.fill;
    this.ctx.strokeStyle = style.stroke;
    if (label && label.text) {
      this.ctx.font = "12px sans-serif";
      this.ctx.fillStyle = label.style.textFill;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(label.text, rect.width / 2, rect.height / 2);
    }
    this.ctx.restore();
  }
}
