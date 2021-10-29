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

class PianoRollRenderer
{
  static pitches = [ "C'", "B", "A#", "A", "G#", "G", "F#", "F", "E", "D#", "D", "C#", "C" ];

  constructor(ctx, styles) {
    this.ctx = ctx;
    this.styles = styles;
    this.viewport = { x: 0, y: 0, width: 0, height: 0 }; 
    this.cellWidth = 30;
    this.cellHeight = 18;
    this._pattern = { notes: [] };
  }

  get pattern() {
    return this._pattern;
  }

  set pattern(value) {
    this._pattern = value;
  }

  resize() {
  }

  draw() {
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.viewport.width, this.viewport.height);
    this.ctx.clip();
  }

  getRow(y) {
    return Math.round(y / this.cellHeight);

  }

  getKeyFromRow(row) {
    return PianoRollRenderer.pitches[row % PianoRollRenderer.pitches.length];
  }

  isKeySharp(key) {
    return key.includes("#")
  }

  drawContainer(rect, style, elevation) {
      this.ctx.save();
      this.ctx.translate(rect.x, rect.y);
      this.ctx.beginPath();
      if(elevation) {
        this.ctx.shadowColor = "#000000";
        this.ctx.shadowBlur = elevation;
      }
      if(style.stroke) {
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = style.stroke;
      }
      this.ctx.fillStyle = style.fill;
      this.ctx.rect(0, 0, rect.width, rect.height);
      this.ctx.fill();
      if(style.stroke) {
        this.ctx.stroke();
      }
      this.ctx.restore();
  }

  drawBackground(rect, scrollY) {
    this.ctx.save();
    this.ctx.translate(0, scrollY);
    const patternWidth = Math.min(this.pattern.notes.length * this.cellWidth, rect.width);
    const inactiveWidth = rect.width - patternWidth;
    // TODO: Handle scroll-offset.
    for(let y = 0; y < rect.height; y += this.cellHeight) {
      const row = this.getRow(scrollY + y);
      const key = this.getKeyFromRow(row);
      const isSharpKey = this.isKeySharp(key);
      const style = isSharpKey ? this.styles.darkRow : this.styles.lightRow;

      this.ctx.beginPath();
      this.ctx.fillStyle = style.fill;
      this.ctx.rect(0, y, patternWidth, this.cellHeight);
      this.ctx.fill();

      if(inactiveWidth > 0) {
        const style = isSharpKey ? this.styles.inactiveDarkRow : this.styles.ianctiveLightRow;

        this.ctx.beginPath();
        this.ctx.fillStyle = style.fill;
        this.ctx.rect(patternWidth, y, inactiveWidth, this.cellHeight);
        this.ctx.fill();
      }
    }
    this.ctx.restore();
  }

  /*renderColumnSeparator(ctx, offsetX, width, height, columnWidth) {
    ctx.save();
    ctx.translate(offsetX, 0);
    let i = 0;
    for(let x = 0; x < width; x += columnWidth) {
      ctx.beginPath();
      ctx.lineWidth = (i % 4) === 0 ? 2 : 1;
      ctx.strokeStyle = this.gridStyles.lightRow.stroke;
      ctx.moveTo(0, 0);
      ctx.lineTo(0, height);
      ctx.stroke();
      ctx.translate(columnWidth, 0);
      i++;
    }
    ctx.restore();
  }

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
      selection: null,
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
  /*updated() {
    console.log("updated");
    const that = this;
    this.$nextTick(() => {
      that.ctx.canvas.width  = this.ctx.canvas.offsetWidth;
      that.ctx.canvas.height = this.ctx.canvas.offsetHeight;
      that.updatePatternNotes();
      that.render();
    });
  },*/
  mounted() {
    this.renderer = new PianoRollRenderer(this.canvas?.getContext("2d"), this.gridStyles);
    window.addEventListener('resize', this.handleResize);
    this.updatePatternNotes();
    this.handleResize();
    /*setInterval(() => {
      this.render();
    }, 1000);*/

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
      requestAnimationFrame(this.render);
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
      if (!this.ctx) return;
      const ctx = this.ctx;

      // Re-size if needed.
      this.canvasWidth = this.canvas.clientWidth;
      this.canvasHeight = this.canvas.clientHeight;
      if(!force) {
        if((this.canvas.width == this.canvasWidth) && (this.canvas.height === this.canvasHeight)) {
          requestAnimationFrame(this.render);
          return;
        }
      }
      this.canvas.width = this.canvasWidth;
      this.canvas.height = this.canvasHeight;

      const w = this.canvasWidth;
      const h = this.canvasHeight;

      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();

      const scrollY = 0;
      const x = 0;
      const y = 0;
      const cellWidth = 50;
      const cellHeight = h / 18;
      this.renderer.cellWidth = cellWidth;
      this.renderer.cellHeight = cellHeight;
      this.cellWidth = cellWidth;
      this.cellHeight = cellHeight;

      let height = 0;

      height = cellHeight * 13;
      ctx.save();
      ctx.translate(50, 0);
      this.renderer.drawBackground({ x: x, y: y, width: w, height: height}, scrollY);
      this.renderColumnSeparator(ctx, x, w, height, cellWidth);
      this.renderNotes(x, y, w, height, cellWidth, cellHeight, this.gridStyles.note);
      ctx.restore();
      this.renderKeys(y, 50);

      ctx.save();
      height = cellHeight * 4;
      ctx.translate(cellWidth, 14 * cellHeight);
      this.renderer.drawBackground({ x: x, y: y, width: w, height: height}, 0);//, w, height, cellHeight, { odd: this.gridStyles.lightRow, even: this.gridStyles.darkRow});
      ctx.translate(-cellWidth, 0);
      ctx.save();

      ctx.save();
      ctx.translate(50, 0);
      this.renderColumnSeparator(ctx, x, w, height, cellWidth);
      this.renderAttibutes(x, y, w, h, cellWidth, cellHeight, this.gridStyles.note);
      ctx.restore();
      ctx.restore();

      this.renderer.drawContainer({ x: 0, y: 0, width: cellWidth, height: this.renderer.cellHeight * 4},
      { fill: "#000000", stroke: this.$vuetify.theme.currentTheme.cellSeparator }, 8);
      for(let lbl of [ "Up", "Down", "Accent", "Slide" ]) {
        this.renderKey(0, 0, 50, cellHeight, this.gridStyles.labelText, { text: lbl, style: this.gridStyles.labelText });
        ctx.translate(0, cellHeight);
      }
      ctx.restore();

      /*ctx.beginPath();
      ctx.clearRect(0, 0, w, h);
      this.renderGrid(ctx, w, h);*/
      requestAnimationFrame(this.render);
    },
    renderColumnSeparator(ctx, offsetX, width, height, columnWidth) {
      ctx.save();
      ctx.translate(offsetX, 0);
      let i = 0;
      for(let x = 0; x < width; x += columnWidth) {
        ctx.beginPath();
        ctx.lineWidth = (i % 4) === 0 ? 2 : 1;
        ctx.strokeStyle = this.gridStyles.lightRow.stroke;
        ctx.moveTo(0, 0);
        ctx.lineTo(0, height);
        ctx.stroke();
        ctx.translate(columnWidth, 0);
        i++;
      }
      ctx.restore();
    },
    renderKeys(scrollY, width) {
      const pitches = [ "C'", "B", "A#", "A", "G#", "G", "F#", "F", "E", "D#", "D", "C#", "C" ];

      this.renderer.drawContainer({ x: 0, y: 0, width: width, height: this.renderer.cellHeight * pitches.length},
      { fill: "#000000", stroke: this.$vuetify.theme.currentTheme.cellSeparator }, 8);

      this.ctx.save();
      for(let pitch of pitches) {
        const sharpPitch = pitch.includes("#");
        this.renderKey(0, 0, width,
          this.cellHeight, sharpPitch ? this.gridStyles.pitchSharpText : this.gridStyles.pitchText,
          { text: pitch, style: sharpPitch ? this.gridStyles.pitchSharpText : this.gridStyles.pitchText });
        this.ctx.translate(0, this.cellHeight);
      }
      this.ctx.restore();
    },
    renderNotes(offsetX, offsetY, width, height, columnWidth, columnHeight, style) {
      this.ctx.save();
      this.ctx.translate(offsetX, offsetY);
      const noteOffsetY = [ 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
      for(let i = 0; i < this.currentPattern.notes.length; ++i) {
        const note = this.currentPattern.notes[i];
        if(note.note !== 0xf) {
          this.renderNote2(i * columnWidth, noteOffsetY[note.note] * columnHeight, columnWidth, columnHeight, style);
        }
      }
      this.ctx.restore();
    },
    renderAttibutes(offsetX, offsetY, width, height, columnWidth, columnHeight, style) {
      const attribs = [ "up", "down", "acc", "slide" ];

      /*this.ctx.save();
      this.ctx.translate(offsetX, offsetY);
      this.ctx.beginPath();
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = "#000000";
      this.ctx.shadowBlur = 8;
      this.ctx.fillStyle = "#000000";
      this.ctx.strokeStyle = this.$vuetify.theme.currentTheme.cellSeparator;
      this.ctx.rect(0, 0, width, this.cellHeight * attribs.length);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();*/

      this.ctx.save();
      this.ctx.translate(offsetX, offsetY);
      for(let i = 0; i < this.currentPattern.notes.length; ++i) {
        const note = this.currentPattern.notes[i];
        if(note.note !== 0xf) {
          for(let j = 0; j < attribs.length; ++j) {
            if(note[attribs[j]]) {
              this.ctx.save();
              this.ctx.translate(0, j * columnHeight);
              this.renderNote2(0, 0, columnWidth, columnHeight, style);
              this.ctx.restore();
            }
          }
        }
        this.ctx.translate(columnWidth, 0);
      }
      this.ctx.restore();
    },
    renderKey(x, y, width, height, style, label) {
      this.renderNote2(x, y, width, height, style, label);
    },
    renderNote2(x, y, width, height, style, label) {
      this.ctx.save()
      this.ctx.translate(x, y);
      this.ctx.beginPath();
      this.ctx.lineWidth = 2;
      this.ctx.fillStyle = style.fill;
      this.ctx.strokeStyle = style.stroke;
      this.ctx.rect(0, 0, width, height);
      this.ctx.fill();
      this.ctx.stroke();
      if (label && label.text) {
        this.ctx.font = "12px sans-serif";
        this.ctx.fillStyle = label.style.textFill;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(label.text, width / 2, height / 2);
      }
      this.ctx.restore();
    },
    renderGrid(ctx, width, height) {
      const rowSize = {
        width: width,
        height: height / (this.gridPitches.length + 6),
      };

      ctx.save();
      for (let row = 0; row < this.gridPitches.length; ++row) {
        const pitch = this.gridPitches[this.gridPitches.length - 1 - row];
        const sharpPitch = pitch.includes("#");
        this.renderRow(
          ctx,
          rowSize,
          row % 2 ? this.gridStyles.lightRow : this.gridStyles.darkRow,
          {
            text: pitch,
            style: sharpPitch
              ? this.gridStyles.pitchSharpText
              : this.gridStyles.pitchText,
          }
        );
        ctx.translate(0, rowSize.height);
      }
      ctx.translate(0, rowSize.height);
      this.renderRow(ctx, rowSize, this.gridStyles.darkRow, {
        text: "Up",
        style: this.gridStyles.labelText,
      });
      ctx.translate(0, rowSize.height);
      this.renderRow(ctx, rowSize, this.gridStyles.lightRow, {
        text: "Down",
        style: this.gridStyles.labelText,
      });
      ctx.translate(0, rowSize.height);
      this.renderRow(ctx, rowSize, this.gridStyles.darkRow, {
        text: "Acc",
        style: this.gridStyles.labelText,
      });
      ctx.translate(0, rowSize.height);
      this.renderRow(ctx, rowSize, this.gridStyles.lightRow, {
        text: "Slide",
        style: this.gridStyles.labelText,
      });
      ctx.translate(0, rowSize.height);
      this.renderRow(ctx, rowSize, this.gridStyles.lightRow, {
        text: "Rest",
        style: this.gridStyles.labelText,
      });
      ctx.restore();

      // Notes.
      const cw = rowSize.width / 17;
      for (let i = 0; i < this.currentPattern.notes.length; ++i) {
        const note = this.currentPattern.notes[i];
        const row = note.note !== 0xf
          ? note.note !== 0xe
            ? (this.gridPitches.length - 1) - note.note
            : 17.5
          : 18;
        const selected = this.selection && (this.selection.x === (i + 1)) && (this.selection.y === row);
        ctx.save();
        ctx.translate(cw + note.pos * cw, row * rowSize.height);
        this.renderNote(
          ctx,
          {
            width: cw * note.length,
            height: rowSize.height,
          },
          selected ? this.gridStyles.selectedNote : this.gridStyles.note
        );
        ctx.restore();

        // Attributes.
        const attribs = [ "up", "down", "acc", "slide" ];
        for(let j = 0; j < 4; ++j) {
          ctx.save();
          const row = 14 + j;
          const selected = this.selection && (this.selection.x === (i + 1)) && (this.selection.y === row);
          ctx.translate(cw + note.pos * cw, (14 + j) * rowSize.height);
          if(note[attribs[j]]) {
            this.renderNote(
              ctx,
              {
                width: cw * note.length,
                height: rowSize.height,
              },
              selected ? this.gridStyles.selectedNote : this.gridStyles.note
            );
          }
          ctx.restore();
        }
      }

      ctx.save();
      ctx.translate(cw, 0);
      if(this.playPos >= 0) {
        this.renderPlayHead(ctx, this.playPos, height, { stroke: "#ff0000" });
      }
      ctx.restore();
    },
    renderRow(ctx, size, style, label) {
      const cellSize = { width: size.width / 17, height: size.height };
      const cellWidthHalf = cellSize.width / 2;
      const cellHeightHalf = cellSize.height / 2;

      ctx.save();
      if (label && label.text) {
        ctx.translate(0, 0);
        this.renderCell(ctx, cellSize, label.style);
        ctx.font = "12px sans-serif";
        ctx.fillStyle = label.style.textFill;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label.text, cellWidthHalf, cellHeightHalf);
      }
      for (let col = 0; col < 16; ++col) {
        ctx.translate(cellSize.width, 0);
        this.renderCell(ctx, cellSize, style);
      }
      ctx.restore();
    },
    renderCell(ctx, size, style) {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.fillStyle = style.fill;
      ctx.strokeStyle = style.stroke;
      ctx.rect(0, 0, size.width, size.height);
      ctx.fill();
      ctx.stroke();
    },
    renderNote(ctx, size, style) {
      this.renderCell(ctx, size, style);
    },
    renderPlayHead(ctx, x, height, style) {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = style.stroke;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.shadowBlur = 0;
      ctx.stroke();
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
        const cell = Math.floor((posX / width) * 17);
        const row = Math.floor((posY / height) * 19);
        const reRender = (!this.selection) || (cell !== this.selection.x) || (row !== this.selection.y);
        this.selection = { x: cell, y: row };
        if(reRender) {
          //this.render();
        }
        //console.log(`x: ${cell} y: ${row}`);
        //this.$emit("mouse-move", evt);
      }
      else
      {
        this.selection = null;
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
