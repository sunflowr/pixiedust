<template>
  <v-container dense class="elevation-5">
    <!--<VuePerfectScrollbar
      class="scroll-area"
      v-once
      :settings="settings"
      @ps-scroll-x="scrollX"
      @ps-scroll-y="scrollY"
    >-->
    <!--<div style="position: relative; width: 100%; height: 300pt">-->
      <canvas
        ref="piano-roll-canvas"
        class="piano-roll-canvas"
        @mousemove="onMouseMove"
        @mousedown="onMouseDown"
        @mouseup="onMouseUp"
      ></canvas>
    <!--</div>-->
    <!--</VuePerfectScrollbar>-->
  </v-container>
</template>

<style scoped lang="scss">
.scroll-area {
  position: relative;
  margin: auto;
  width: 400px;
  height: 300px;
}

.piano-roll-canvas {
  display: block;
  width: 100%;
  height: 320pt;
}
</style>

<script>
//import VuePerfectScrollbar from "vue-perfect-scrollbar";

/* eslint-disable no-unused-vars */
const ic3Offset = 0x400;
const ic4Offset = 0x800;
const groupOffset = [
  ic3Offset | 0x000,
  ic3Offset | 0x000,
  ic3Offset | 0x080,
  ic3Offset | 0x080,
  ic4Offset | 0x000,
  ic4Offset | 0x000,
  ic4Offset | 0x080
];
const sectionOffset = [ 0x000, 0x100 ]; // A, B
const patternOffset = [ 0x00, 0x40, 0x20, 0x60, 0x10, 0x50, 0x30, 0x70 ];
const stepIndices = [
  0x000, 0x004, 0x002, 0x006, 0x001, 0x005, 0x003, 0x007,
  0x200, 0x204, 0x202, 0x206, 0x201, 0x205, 0x203, 0x207,
];
const noteLabels = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C'" ];
/* eslint-enable no-unused-vars */

class Rect
{
  constructor(x, y, width, height) {
    if(x instanceof Rect) {
      this.x = x.x;
      this.y = x.y;
      this.width = x.width;
      this.height = x.height;
    } else if(x instanceof Object) {
      this.x = x.x;
      this.y = x.y;
      this.width = x.width;
      this.height = x.height;
    } else if((!isNaN(x)) &&
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

  inside(x, y) {
    if(x instanceof Object) {
      y = x.y;
      x = x.x;
    }
    return (x >= this.left) && (x <= this.right) && (y >= this.top) && (y <= this.bottom);
  }
}

/*class Panel
{
  constructor(ctx, rect, style, content) {
    this.rect = rect;
    this.content = content;
  }

  draw() {
    this.ctx.save();
    this._drawRect(this.rect, this.style);
    this._clipRect(this.rect);

    this.ctx.save();
    const innerRect = { x: 0, y: 0, width: this.rect.width, height: this.rect.height };
    //const innerRect = { x: 0, y: 0, width: rect.width - rect.x, height: rect.height - rect.y };
    this.ctx.translate(this.rect.x, this.rect.y);
    this.content?.(innerRect);
    this.ctx.restore()
    this.ctx.restore()
  }
}*/

class PianoRollRenderer
{
  static pitches = [ "C'", "B", "A#", "A", "G#", "G", "F#", "F", "E", "D#", "D", "C#", "C" ];

  constructor(ctx, styles) {
    this.ctx = ctx;
    this.styles = styles;
    this.viewport = { x: 0, y: 0, width: 0, height: 0 }; 
    this.keyWidth = 60;
    this.cellWidth = 50;
    this.cellHeight = 24;
    this.splitterMargin = 2;
    this._cursorPos = { x: -100, y: -100 };
    this._pattern = { notes: [] };
    this.styles.colors = {};
    this.styles.colors.shadowH = this.ctx.createLinearGradient(0, 0, 20, 0);
    this.styles.colors.shadowH.addColorStop(0, "rgba(0,0,0,0.3)");
    this.styles.colors.shadowH.addColorStop(1, "rgba(0,0,0,0.0)");
    this.styles.colors.shadowV = this.ctx.createLinearGradient(0, 0, 0, 20);
    this.styles.colors.shadowV.addColorStop(0, "rgba(0,0,0,0.3)");
    this.styles.colors.shadowV.addColorStop(1, "rgba(0,0,0,0.0)");

    this._drawRectStack = [];
    this._activeId = -1;
    this._hoverId = -1;
    this._currentId = -1;

    this.vSplitterId = 10000;

    this._updatePass = -1;
    this._redraw = true;
    this._mouseCursor = "default";
  }

  get isUpdatePass() {
    return this._updatePass === 0;
  }

  get isDrawPass() {
    return this._updatePass === 1;
  }

  get pattern() {
    return this._pattern;
  }

  set pattern(value) {
    this._pattern = value;
  }

  set cursorPos(value) {
    this._cursorPos = value;
  }

  get width() {
    return this.keyWidth + (this.splitterMargin * 2) + (this.pattern.notes.length * this.cellWidth);
  }

  get height() {
    return (PianoRollRenderer.pitches.length * this.cellHeight) + (this.splitterMargin * 2) + (4 * this.cellHeight);
  }

  get mouseCursor() {
    return this._mouseCursor;
  }

  resize(width, height) {
    this.viewport.width = width;
    this.viewport.height = height;
    this._redraw = true;
  }

  draw(width, height) {
    this.viewport.width = width;
    this.viewport.height = height;

    const scrollX = 0;
    const scrollY = 0;
    const hSplit = this.keyWidth;
    const vSplit = this.viewport.height - (this.cellHeight * 4);

    let prevMaxId = -1;
    let prevActiveId = this._activeId;
    this._activeId = -1;
    this._mouseCursor = "default";
    for(let p = 0; p < 2; ++p) {
      this._currentId = 0;
      this._updatePass = p;

      if(this.isDrawPass && (!this._redraw)) {
        return;
      }

      if(this.isDrawPass) {
        console.log("draw");
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.viewport.width, this.viewport.height);
        this.ctx.clip();
      }

      this.horizontalSplit(this._getId(), new Rect(0, 0, this.viewport.width, this.viewport.height),
        vSplit,
        {},
        rect => {
          this.verticalSplit(this.vSplitterId, new Rect({...rect, height: Math.min(rect.height, this.cellHeight * 13)}),
          hSplit,
          this.styles.lightRow,
          rect => this.drawKeys(rect, scrollY),
          rect => {
            this.drawBackground(rect, scrollY);
            this.drawMeasures(rect, scrollX);
            this.drawNotes(rect, scrollX, scrollY);
            // Add a small shadow for depth.
            this._drawRect(new Rect({...rect, width: 20}), { fill: this.styles.colors.shadowH });
            this._drawRect(new Rect({...rect, height: 20}), { fill: this.styles.colors.shadowV });
          });
        },
        rect => this.verticalSplit(this.vSplitterId, rect,
          hSplit,
          {},
          rect => {
            const lbls = [ "Up", "Down", "Accent", "Slide" ];
            for(let i = 0; i < lbls.length; ++i) {
              this.drawKey(this._getId(),
                new Rect({...rect, y: i * this.cellHeight, height: this.cellHeight}),
                this.styles.labelText, { text: lbls[i], style: this.styles.labelText });
            }
          },
          rect => {
            this.drawBackground(rect, 0);
            this.drawMeasures(rect, scrollX);
            this.drawAttibutes(rect, scrollX, scrollY);
            // Add a small shadow for depth.
            this._drawRect(new Rect({...rect, width: 20}), { fill: this.styles.colors.shadowH });
            this._drawRect(new Rect({...rect, height: 20}), { fill: this.styles.colors.shadowV });
          })
        );

        if(this.isUpdatePass) {
          if(this._activeId !== prevActiveId) {
            this._redraw = true;
          }
        }

        if(prevMaxId >= 0) {
          if(prevMaxId !== this._currentId) {
            throw new Error("Missmatch in id's between passes.");
          }
        }
        prevMaxId = this._currentId;
    }

    this._redraw = false;
  }

  getRow(y) { return Math.round(y / this.cellHeight); }
  getKeyFromRow(row) { return PianoRollRenderer.pitches[row % PianoRollRenderer.pitches.length]; }
  isKeySharp(key) { return key.includes("#") }

  horizontalSplit(id, rect, splitY, style, content1, content2) {
    this._pushDrawRect(rect);
    const margin = this.splitterMargin * 2;
    const marginHalf = this.splitterMargin;
    const separator = Math.min(splitY, rect.height);
    this.drawPanel({...rect, height: separator - marginHalf }, style, content1);
    this.drawPanel({...rect, y: (rect.y + separator) + marginHalf, height: rect.height - (separator + marginHalf)}, style, content2);
    this.drawSplitter(id, new Rect({...rect, y: (rect.y + separator) - marginHalf, height: margin}), {...this.styles.background, mouseCursor: "row-resize" });
    this._popDrawRect();
  }

  verticalSplit(id, rect, splitX, style, content1, content2) {
    this._pushDrawRect(rect);
    const margin = this.splitterMargin * 2;
    const marginHalf = this.splitterMargin;
    const separator = Math.min(splitX, rect.width);
    this.drawPanel({...rect, width: separator - marginHalf }, style, content1);
    this.drawPanel({...rect, x: (rect.x + separator) + marginHalf, width: rect.width - (separator + marginHalf)}, style, content2);
    this.drawSplitter(id, new Rect({...rect, x: (rect.x + separator) - marginHalf, width: margin}), {...this.styles.background, mouseCursor: "col-resize" });
    this._popDrawRect();
  }

  drawSplitter(id, rect, style) {
    if(this.isUpdatePass) {
      if(rect.inside(this._localCursorPos)) {
        this._activeId = id;
      }
    }

    if(this._activeId === id) {
      style = {...style};
      style.stroke = "#ffffff";
      style.strokeWidth = 2;
      rect = new Rect(rect);
      rect.x += style.strokeWidth;
      rect.y += style.strokeWidth;
      rect.width -= style.strokeWidth * 2;
      rect.height -= style.strokeWidth * 2;
      this._mouseCursor = style.mouseCursor ?? "default";
    }
    this._drawRect(rect, style);
  }

  drawPanel(rect, style, content) {
    const innerRect = new Rect(0, 0, rect.width, rect.height);

    this._pushDrawRect(rect);
    this._drawRect(rect, style);
    this._clipRect(rect);
    this._pushDrawRect(innerRect);
    this.ctx.translate(rect.x, rect.y);
    content?.(innerRect);
    this._popDrawRect();
    this._popDrawRect();
  }

  /* eslint-disable no-unused-vars */
  drawKeys(rect, scrollY) {
    // TODO: Handle scroll-offset.
    const pitches = [ "C'", "B", "A#", "A", "G#", "G", "F#", "F", "E", "D#", "D", "C#", "C" ];

    this._pushDrawRect(rect);
    this.ctx.translate(rect.x, rect.y);
    for(let i = 0; i < pitches.length; ++i) {
      const sharpPitch = this.isKeySharp(pitches[i]);
      this.drawKey(this._getId(),
        new Rect({...rect, x: 0, y: i * this.cellHeight, height: this.cellHeight}),
        sharpPitch ? this.styles.pitchSharpText : this.styles.pitchText,
        { text: pitches[i], style: sharpPitch ? this.styles.pitchSharpText : this.styles.pitchText });
    }
    this._popDrawRect();
  }
  /* eslint-enable no-unused-vars */

  drawKey(id, rect, style, label) {
    this.drawNote(id, rect, style, label);
  }

  drawBackground(rect, scrollY) {
    // TODO: Handle scroll-offset.
    this._pushDrawRect(rect);
    const patternWidth = Math.min(this.pattern.notes.length * this.cellWidth, rect.width);
    const inactiveWidth = rect.width - patternWidth;
    for(let y = 0; y < rect.height; y += this.cellHeight) {
      const row = this.getRow(scrollY + y);
      const key = this.getKeyFromRow(row);
      const isSharpKey = this.isKeySharp(key);
      const style = isSharpKey ? this.styles.darkRow : this.styles.lightRow;
      this._drawRect({x: 0, y: y, width: patternWidth, height: this.cellHeight}, {fill: style.fill});

      if(inactiveWidth > 0) {
        const style = isSharpKey ? this.styles.inactiveDarkRow : this.styles.ianctiveLightRow;
        this._drawRect({x: patternWidth, y: y, width: inactiveWidth, height: this.cellHeight}, {fill: style.fill});
      }
    }
    this._popDrawRect();
  }

  drawMeasures(rect, scrollX) {
    // TODO: Handle scroll-offset.
    let i = 0;
    for(let x = 0; x < rect.width; x += this.cellWidth) {
      const from = {x: rect.x + scrollX + x, y: rect.y};
      this._drawLine(from, {...from, y: from.y + rect.height}, {...this.styles.lightRow, lineWidth: (i % 4) === 0 ? 2 : 1})
      i++;
    }
  }

  drawNotes(rect, scrollX, scrollY) {
    // TODO: Handle scroll-offset.
    const noteOffsetY = [ 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    const noteRest = 0xf;

    this._pushDrawRect(rect);
    this.ctx.translate(scrollX, scrollY);
    for(let i = 0; i < this.pattern.notes.length; ++i) {
      const note = this.pattern.notes[i];
      if(note.note !== noteRest) {
        this.drawNote(this._getId(), {
          x: i * this.cellWidth,
          y: noteOffsetY[note.note] * this.cellHeight,
          width: this.cellWidth,
          height: this.cellHeight
          }, this.styles.note);
      }
    }
    this._popDrawRect();
  }

  drawAttibutes(rect, scrollX, scrollY) {
    // TODO: Handle scroll-offset.
    const attribs = [ "up", "down", "acc", "slide" ];

    this._pushDrawRect(rect);
    this.ctx.translate(scrollX, scrollY);
    for(let i = 0; i < this.pattern.notes.length; ++i) {
      const note = this.pattern.notes[i];
      if(note.note !== 0xf) {
        for(let j = 0; j < attribs.length; ++j) {
          if(note[attribs[j]]) {
            this.drawNote(this._getId(),{
                x: i * this.cellWidth,
                y: j * this.cellHeight,
                width: this.cellWidth,
                height: this.cellHeight
              }, this.styles.note);
          }
        }
      }
    }
    this._popDrawRect();
  }

  drawNote(id, rect, style, label) {
    if(this.isUpdatePass) {
      const myRect = new Rect(rect);
      if(myRect.inside(this._localCursorPos)) {
        this._activeId = id;
      }
    }

    if(this._activeId === id) {
      style = {...style};
      style.stroke = "#ffffff";
      style.strokeWidth = 2;
      rect = new Rect(rect);
      rect.x += style.strokeWidth;
      rect.y += style.strokeWidth;
      rect.width -= style.strokeWidth * 2;
      rect.height -= style.strokeWidth * 2;
    }
    this._drawRect(rect, style);
    if(label && label.text) {
      this._drawText(rect, label, style);
    }
  }

  drawPlayHead(ctx, x, height, style) {
    // TODO: Refactor everything!
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = style.stroke;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.shadowBlur = 0;
    ctx.stroke();
  }

  _clipRect(rect) {
    if(!this.isDrawPass) {
      return;
    }

    this.ctx.beginPath();
    this.ctx.rect(rect.x, rect.y, rect.width, rect.height);
    this.ctx.clip();
  }

  _drawRect(rect, style) {
    if(!this.isDrawPass) {
      return;
    }

    this._pushDrawRect(rect);
    this.ctx.beginPath();
    if(style.elevation) {
      this.ctx.shadowColor = style.elevationColor ?? "#000000";
      this.ctx.shadowBlur = style.elevation;
    }
    if(style.stroke) {
      this.ctx.lineWidth = style.strokeWidth ?? 2;
      this.ctx.strokeStyle = style.stroke;
    }
    if(style.fill) {
      this.ctx.fillStyle = style.fill;
    }
    this.ctx.rect(rect.x, rect.y, rect.width, rect.height);
    if(style.fill) {
      this.ctx.fill();
    }
    if(style.stroke) {
      this.ctx.stroke();
    }
    this._popDrawRect();
  }

  _drawLine(from, to, style) {
    if(!this.isDrawPass) {
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

  _drawText(rect, label, style) {
    if(!this.isDrawPass) {
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

  get _currentDrawRect() {
    if(this._drawRectStack.length > 0) {
      return this._drawRectStack[this._drawRectStack.length - 1];
    }
    return this.viewport;
  }

  get _absolutePos() {
    let pos = { x: 0, y: 0};
    for(let i = (this._drawRectStack.length - 1); i >= 0; --i) {
      pos.x += this._drawRectStack[i].x;
      pos.y += this._drawRectStack[i].y;
    }

    return pos;
  }

  get _localCursorPos() {
    const absPos = this._absolutePos;
    const cursorPos = this._cursorPos;
    return { x: cursorPos.x - absPos.x, y: cursorPos.y - absPos.y };
  }

  _pushDrawRect(rect) {
    this._drawRectStack.push(rect);
    this.ctx.save();
  }

  _popDrawRect() {
    this.ctx.restore();
    return this._drawRectStack.pop();
  }

  _getId() {
    return this._currentId++;
  }

  /*
  drawMeasures(offsetX) {
    this.ctx.save();
    for(let x = 0; x < this.width; x += columnWidth) {
      this.ctx.beginPath();
      this.ctx.lineWidth = (i % 4) === 0 ? 2 : 1;
      this.ctx.strokeStyle = this.gridStyles.lightRow.stroke;
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(0, height);
      this.ctx.stroke();
      this.ctx.translate(columnWidth, 0);
      i++;
    }
    this.ctx.restore();
  }*/

}

export default {
  name: "PianoRoll",
  components: {
    //VuePerfectScrollbar,
  },
  data() {
    return {
      canvasWidth: 600,
      canvasHeight: 300,
      renderer: null,
      keys: noteLabels,
      settings: {
        maxScrollbarLength: 60,
      },
      gridPitches: [
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B",
        "C'",
      ],
      gridStyles: {
        pitchText: {
          textFill: "#000000",
          fill: "#ffffff",
          stroke: this.$vuetify.theme.currentTheme.cellSeparator,
        },
        pitchSharpText: {
          textFill: "#ffffff",
          fill: "#1f1f1f",
          stroke: this.$vuetify.theme.currentTheme.cellSeparator,
        },
        labelText: {
          textFill: "#ffffff",
          fill: "#455A64",
          stroke: this.$vuetify.theme.currentTheme.cellSeparator,
        },
        darkRow: {
          fill: this.$vuetify.theme.currentTheme.columnDark,
          stroke: this.$vuetify.theme.currentTheme.cellSeparator,
        },
        lightRow: {
          fill: this.$vuetify.theme.currentTheme.columnLight,
          stroke: this.$vuetify.theme.currentTheme.cellSeparator,
        },
        inactiveDarkRow: {
          fill: this.$vuetify.theme.currentTheme.inactiveColumnDark,
          stroke: this.$vuetify.theme.currentTheme.cellSeparator,
        },
        ianctiveLightRow: {
          fill: this.$vuetify.theme.currentTheme.inactiveColumnLight,
          stroke: this.$vuetify.theme.currentTheme.cellSeparator,
        },
        note: {
          fill: this.$vuetify.theme.currentTheme.noteColor,
          stroke: this.$vuetify.theme.currentTheme.cellSeparator,
        },
        selectedNote: {
          fill: this.$vuetify.theme.currentTheme.noteColor,
          stroke: this.$vuetify.theme.currentTheme.selectedNoteStroke,
        },
        background: {
          fill: this.$vuetify.theme.currentTheme.cellSeparator
        }
      },
    };
  },
  props: {
    backupFile: Object,
    patternGroup: Number,
    patternSection: Number,
    pattern: Number,
    playPos: {
      type: Number,
      default: -1
    }
  },
  computed: {
    canvas() {
      return this.$refs["piano-roll-canvas"];
    },
    ctx() {
      return this.canvas?.getContext("2d", { alpha: false });
    },
    pianoRollCanvasStyle() {
      return "display: block;"
            + "width: " +  this.canvasWidth + "pt;"
            + "height: " + this.canvasHeight + "pt";
    }
  },
  watch: {
    backupFile() { this.updatePatternNotes(); this.render(true); },
    patternGroup() { this.updatePatternNotes(); this.render(true); },
    patternSection() { this.updatePatternNotes(); this.render(true); },
    pattern() { this.updatePatternNotes(); this.render(true); }
  },
  mounted() {
    this.renderer = new PianoRollRenderer(this.canvas?.getContext("2d"), this.gridStyles);
    window.addEventListener('resize', this.handleResize);
    this.updatePatternNotes();
    this.handleResize();
    /*
    https://v3.vuejs.org/guide/migration/introduction.html#breaking-changes
    https://v3.vuejs.org/guide/migration/introduction.html#devtools-extension
    https://johnpapa.net/vue2-to-vue3/
    https://eslint.vuejs.org/
    https://medium.com/@LegendofColt/eslint-for-vue-js-f39194f15beb
    https://dev.to/reiallenramos/drawing-in-vue-using-mousemove-event-34cg
    https://stackoverflow.com/questions/13576149/creating-an-html5-piano-roll-editor
    https://lavrton.com/hit-region-detection-for-html5-canvas-and-how-to-listen-to-click-events-on-canvas-shapes-815034d7e9f8/
    https://stackoverflow.com/questions/16531327/get-canvas-size-from-its-context
    https://medium.com/@scottmatthew/using-html-canvas-with-vue-js-493e5ae60887
    https://www.digitalocean.com/community/tutorials/vuejs-vue-html5-canvas
    https://github.com/lecion/vue-perfect-scrollbar
    https://vuejs.org/v2/cookbook/avoiding-memory-leaks.html
    https://vuetifyjs.com/en/styles/colors/#material-colors
    https://vuetifyjs.com/en/features/theme/#example
    https://github.com/lecion/vue-perfect-scrollbar
    https://binaryify.github.io/vue-custom-scrollbar/en/#why-custom-scrollbar
    https://stackoverflow.com/questions/36219632/html5-canvas-scrolling-vertically-and-horizontally
    var canvas = this.$refs["piano-roll-canvas"];
    var scrollbar = {
      left: 0,
      top: 0,
      Scrollbar: function(vertical) {
        let that = { vertical: vertical};
        that.left = vertical ? (canvas.width - 10) : 0;
        that.top = vertical ? 0 : (canvas.height - 10);
        that.height = vertical ? (canvas.height - 10) : 5;
        that.width = vertical ? 5 : (canvas.height - 10);

        that.cursor = {
          radius: 5,
          fill: "#bababa"
        };
        that.cursor.top = vertical ? that.cursor.radius : (that.top + (that.cursor.radius / 2));
        that.cursor.left = vertical ? (that.left + (that.cursor.radius / 2)) : that.cursor.radius;

        that.draw = function() {
        }

        that.isHover = function() {
        }

        return that;
      }
    }*/
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    handleResize() {
      //that.$nextTick(() => that.render());
      this.canvas.height = this.renderer.height;
      requestAnimationFrame(() => this.render(true));
    },
    updatePatternNotes() {
      this.currentPattern = {
        notes: []
      };

      const offset = groupOffset[this.patternGroup] | sectionOffset[this.patternSection] | patternOffset[this.pattern];
      for(let i = 0; i < stepIndices.length; ++i) {
        const address = offset + stepIndices[i];
        let noteData = this.backupFile.data[address >>> 1];
        if(address & 1) {
          noteData = (noteData & 0xf0) >>> 4;
        } else {
          noteData = (noteData & 0x0f) >>> 0;
        }
        let attribData = this.backupFile.data[(address | 0x8) >>> 1];
        if(address & 1) {
          attribData = (attribData & 0xf0) >>> 4;
        } else {
          attribData = (attribData & 0x0f) >>> 0;
        }
        if(noteData === 0xE)
        {
          break;
        }
        this.currentPattern.notes.push({
          note: noteData,
          up: (attribData & 0x02) !== 0,
          down: (attribData & 0x01) !== 0,
          acc: (attribData & 0x04) !== 0,
          slide: (attribData & 0x08) !== 0,
          rest: noteData === 0xf
        });
        //const hexAddress = "0x" + (address >>> 0).toString(16).padStart(4, "0");
        //console.log(`${i.toString().padStart(2)}: ${hexAddress}: ${noteLabels[noteData & 0x7]}:${attribData}`);
      }

      this.renderer.pattern = this.currentPattern;
    },
    render(force) {
      if (!this.ctx){
        return;
      }

      // Re-size if needed.
      this.canvasWidth = Math.round(this.canvas.clientWidth);
      this.canvasHeight = Math.round(this.renderer.height);//this.canvas.clientHeight;
      if(force || (Math.round(this.canvas.width) !== this.canvasWidth) || (Math.round(this.canvas.height) !== this.canvasHeight)) {
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        this.canvas.style.height = this.canvasHeight.toString() + "px";
        this.renderer.resize(this.canvasWidth, this.canvasHeight);
      }

      this.renderer.draw(this.canvasWidth, this.canvasHeight);
      this.canvas.style.cursor = this.renderer.mouseCursor;
      requestAnimationFrame(() => this.render(false));
    },
    onMouseMove(evt) {
      const bounds = this.ctx.canvas.getBoundingClientRect();
      const scaleH = this.ctx.canvas.width / bounds.width;
      const scaleV = this.ctx.canvas.height / bounds.height;
      const posX = Math.floor(evt.clientX - bounds.x) * scaleH;
      const posY = Math.floor(evt.clientY - bounds.y) * scaleV;
      const width = Math.floor(bounds.width * scaleH);
      const height = Math.floor(bounds.height * scaleV);
      if((posX >= 0) && (posX < width) && (posY >= 0) && (posY < height))
      {
        if(this.renderer) this.renderer.cursorPos = { x: posX, y: posY };
        //this.$emit("mouse-move", evt);
      }
      else
      {
        if(this.renderer) this.renderer.cursorPos = { x: -100, y: -100 };
      }
    },
    /* eslint-disable no-unused-vars */
    /* eslint-disable no-console */
    onMouseDown(evt) {
      //this.$emit("mouse-down", evt);
    },
    onMouseUp(evt) {
      //this.$emit("mouse-up", evt);
    },
    scrollX(evt) {
      /* eslint-disable no-console */
      //console.log(evt);
      /* eslint-enable no-console */
    },
    scrollY(evt) {
      //console.log(evt);
    },
    /* eslint-enable no-console */
    /* eslint-enable no-unused-vars */
  },
};
</script>
