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
import { UIEventTypes, Rect, UI } from "@/ui";
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

class UINote {
  draw(ui, id, rect, content, /*state*/) {
    ui._drawRect(rect, this.style);
    if(content) {
      this.ui._drawText(rect, content, this.style);
    }
  }
}

class PianoRollRenderer
{
  static pitches = [ "C'", "B", "A#", "A", "G#", "G", "F#", "F", "E", "D#", "D", "C#", "C" ];

  constructor(ui, styles) {
    this.ui = ui;
    this.styles = styles;
    this.viewport = { x: 0, y: 0, width: 0, height: 0 }; 
    this.keyWidth = 60;
    this.cellWidth = 50;
    this.cellHeight = 24;
    this.splitterMargin = 2;
    this._pattern = { notes: [] };
    this.styles.colors = {};
    this.styles.colors.shadowH = this.ui.canvasCtx.createLinearGradient(0, 0, 20, 0);
    this.styles.colors.shadowH.addColorStop(0, "rgba(0,0,0,0.3)");
    this.styles.colors.shadowH.addColorStop(1, "rgba(0,0,0,0.0)");
    this.styles.colors.shadowV = this.ui.canvasCtx.createLinearGradient(0, 0, 0, 20);
    this.styles.colors.shadowV.addColorStop(0, "rgba(0,0,0,0.3)");
    this.styles.colors.shadowV.addColorStop(1, "rgba(0,0,0,0.0)");
    this.styles.note2 = new UINote();
    this.styles.colors.note = {}
    this.styles.colors.note.fill = this.ui.canvasCtx.createLinearGradient(0, 0, 0, this.cellHeight);
    this.styles.colors.note.fill.addColorStop(0, "rgb(255,255,255");
    this.styles.colors.note.fill.addColorStop(0.1, "rgb(255,50,0");
    this.styles.colors.note.fill.addColorStop(0.9, "rgb(100,50,0");
    this.styles.colors.note.fill.addColorStop(1, "rgb(0,0,0");
    this.styles.colors.note.stroke = "#000000";
    this.styles.colors.note.strokeWidth = 1;


    this.vSplitterId = 10000;
    this.hSplit = this.keyWidth;
    this.vSplit = this.viewport.height - (this.cellHeight * 4);

    this.scrollState = { x: 0, y: 0 };
    this.headerHeight = this.cellHeight;
  }

  get pattern() {
    return this._pattern;
  }

  set pattern(value) {
    this._pattern = value;
  }

  get width() {
    return this.keyWidth + (this.splitterMargin * 2) + (this.pattern.notes.length * this.cellWidth);
  }

  get height() {
    return this.headerHeight +
      (PianoRollRenderer.pitches.length * this.cellHeight) +
      (this.splitterMargin * 2) +
      (4 * this.cellHeight);
  }

  draw(rect) {
    this.viewport.width = rect.width;
    this.viewport.height = rect.height;

    const scrollX = 0;
    const scrollY = 0;

    if(UI.currentEvent.type === UIEventTypes.drawEvent) {
      this.ui.canvasCtx.beginPath();
      this.ui.canvasCtx.rect(0, 0, this.viewport.width, this.viewport.height);
      this.ui.canvasCtx.clip();
    }

    this.hSplit = this.keyWidth;
    this.vSplit = this.viewport.height - this.headerHeight - (this.cellHeight * 4);

    //const patternWidth = this.pattern.notes.length * this.cellWidth;

    this.drawLabel(new Rect(0, 0, this.viewport.width, this.headerHeight), this.styles.darkRow, { text: "Pattern preview", style: this.styles.labelText });
    this.ui.horizontalSplit(UI.getId(), new Rect(0, this.headerHeight, this.viewport.width, this.viewport.height - this.headerHeight),
      this.vSplit,
      this.styles.lightRow,
      rect => {
        this.ui.verticalSplit(this.vSplitterId, new Rect({...rect, height: Math.min(rect.height, this.cellHeight * 13)}),
          this.hSplit,
          this.styles.lightRow,
          rect => this.drawKeys(rect, scrollY),
          rect => {
            //this.scrollState = this.ui.scrollView(new Rect(rect), {}, new Rect({...rect, width: patternWidth}), this.scrollState, rect => {
              this.drawBackground(new Rect(rect), scrollY);
              this.drawMeasures(new Rect(rect), scrollX);
              this.drawNotes(new Rect(rect), scrollX, scrollY);
              // Add a small shadow for depth.
              this.ui.canvasCtx.save();
              this.ui.canvasCtx.translate(rect.left, rect.top);
              this.ui._drawRect(new Rect(0, 0, 20, rect.height), { fill: this.styles.colors.shadowH });
              this.ui._drawRect(new Rect(0, 0, rect.width, 20), { fill: this.styles.colors.shadowV });
              this.ui.canvasCtx.restore();
            //});
          });
      },
      rect => {
        this.ui.verticalSplit(this.vSplitterId, rect, this.hSplit, this.styles.lightRow,
          rect => {
            const lbls = [ "Up", "Down", "Accent", "Slide" ];
            for(let i = 0; i < lbls.length; ++i) {
              this.drawLabel(new Rect(rect.left, rect.top + (i * this.cellHeight), rect.width, this.cellHeight),
                this.styles.labelText,
                { text: lbls[i], style: this.styles.labelText });
            }
          },
          rect => {
            this.drawBackground(new Rect(rect), 0);
            this.drawMeasures(new Rect(rect), scrollX);
            this.drawAttibutes(new Rect(rect), scrollX, scrollY);
            // Add a small shadow for depth.
            this.ui.canvasCtx.save();
            this.ui.canvasCtx.translate(rect.left, rect.top);
            this.ui._drawRect(new Rect(0, 0, 20, rect.height), { fill: this.styles.colors.shadowH });
            this.ui._drawRect(new Rect(0, 0, rect.width, 20), { fill: this.styles.colors.shadowV });
            this.ui.canvasCtx.restore();
          });
      });
  }

  getRow(y) { return Math.round(y / this.cellHeight); }
  getKeyFromRow(row) { return PianoRollRenderer.pitches[row % PianoRollRenderer.pitches.length]; }
  isKeySharp(key) { return key.includes("#") }

  /* eslint-disable no-unused-vars */
  drawKeys(rect, scrollY) {
    // TODO: Handle scroll-offset.
    const pitches = [ "C'", "B", "A#", "A", "G#", "G", "F#", "F", "E", "D#", "D", "C#", "C" ];

    for(let i = 0; i < pitches.length; ++i) {
      const sharpPitch = this.isKeySharp(pitches[i]);
      this.drawLabel(new Rect(rect.left, rect.top + (i * this.cellHeight), rect.width, this.cellHeight),
        sharpPitch ? this.styles.pitchSharpText : this.styles.pitchText,
        { text: pitches[i], style: sharpPitch ? this.styles.pitchSharpText : this.styles.pitchText });
    }
  }
  /* eslint-enable no-unused-vars */

  drawBackground(rect, scrollY) {
    // TODO: Handle scroll-offset.
    const patternWidth = Math.min(this.pattern.notes.length * this.cellWidth, rect.width);
    const inactiveWidth = rect.width - patternWidth;
    for(let y = rect.top; y < rect.bottom; y += this.cellHeight) {
      const row = this.getRow(scrollY + y);
      const key = this.getKeyFromRow(row);
      const isSharpKey = this.isKeySharp(key);
      const style = isSharpKey ? this.styles.darkRow : this.styles.lightRow;
      this.ui._drawRect(new Rect(rect.x, y, patternWidth, this.cellHeight), {fill: style.fill});

      if(inactiveWidth > 0) {
        const style = isSharpKey ? this.styles.inactiveDarkRow : this.styles.ianctiveLightRow;
        this.ui._drawRect(new Rect(rect.x + patternWidth, y, inactiveWidth, this.cellHeight), {fill: style.fill});
      }
    }
  }

  drawMeasures(rect, scrollX) {
    // TODO: Handle scroll-offset.
    let i = 0;
    for(let x = rect.left; x < rect.right; x += this.cellWidth) {
      const from = {x: x + scrollX, y: rect.top};
      const to = {x: from.x, y: rect.bottom};
      this.ui._drawLine(from, to, {...this.styles.lightRow, lineWidth: (i % 4) === 0 ? 2 : 1})
      i++;
    }
  }

  /* eslint-disable no-unused-vars */
  drawNotes(rect, scrollX, scrollY) {
    // TODO: Handle scroll-offset.
    const noteOffsetY = [ 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    const noteRest = 0xf;

    for(let i = 0; i < this.pattern.notes.length; ++i) {
      const note = this.pattern.notes[i];
      if(note.note !== noteRest) {
        const x = rect.left + (i * this.cellWidth);
        const y = rect.top + (noteOffsetY[note.note] * this.cellHeight);
        this.drawNote(new Rect(x, y, this.cellWidth, this.cellHeight), this.styles.note);
      }
    }
  }
  /* eslint-enable no-unused-vars */

  /* eslint-disable no-unused-vars */
  drawAttibutes(rect, scrollX, scrollY) {
    // TODO: Handle scroll-offset.
    const attribs = [ "up", "down", "acc", "slide" ];

    for(let i = 0; i < this.pattern.notes.length; ++i) {
      const note = this.pattern.notes[i];
      if(note.note !== 0xf) {
        for(let j = 0; j < attribs.length; ++j) {
          if(note[attribs[j]]) {
            const x = rect.left + (i * this.cellWidth);
            const y = rect.top + (j * this.cellHeight);
            this.drawNote(new Rect(x, y, this.cellWidth, this.cellHeight), this.styles.note);
            //this.note(new Rect(x, y, this.cellWidth, this.cellHeight));
          }
        }
      }
    }
  }
  /* eslint-enable no-unused-vars */
  
  note(rect, label) {
    return this.ui.doButton(UI.getId(), rect, label, this.styles.note2);
  }

  drawLabel(rect, style, label) {
    this.ui.label(UI.getId(), rect, style, (rect, style) => {
      this.ui._drawRect(rect, style);
      if(label && label.text) {
        this.ui._drawText(rect, label, style);
      }
    });
  }

  drawNote(rect, style, label) {
    return this.ui.button(UI.getId(), rect, style, (rect, style) => {
      this.ui._drawRect(rect, style);
      if(label && label.text) {
        this.ui._drawText(rect, label, style);
      }
    });
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
    UI.instance.canvasCtx = this.ctx;
    this.renderer = new PianoRollRenderer(UI.instance, this.gridStyles);
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
        UI.instance.resize(this.canvasWidth, this.canvasHeight);
      }

      UI.instance.begin();
      UI.instance.update(rect => {
        this.renderer.draw(rect);//new Rect(0, 0, this.canvasWidth, this.canvasHeight));
      });
      UI.instance.end();
      this.canvas.style.cursor = UI.instance.mouseCursor;
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
        UI.instance.cursorPos = { x: posX, y: posY };
        //this.$emit("mouse-move", evt);
      }
      else
      {
        UI.instance.cursorPos = { x: -100, y: -100 };
      }
    },
    /* eslint-disable no-unused-vars */
    /* eslint-disable no-console */
    onMouseDown(evt) {
      UI.instance.mouseDown = 1;
      //this.$emit("mouse-down", evt);
    },
    onMouseUp(evt) {
      UI.instance.mouseUp = 1;
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
