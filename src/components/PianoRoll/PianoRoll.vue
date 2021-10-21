<template>
  <v-container>
    <!--<VuePerfectScrollbar
      class="scroll-area"
      v-once
      :settings="settings"
      @ps-scroll-x="scrollX"
      @ps-scroll-y="scrollY"
    >-->
    <canvas
      ref="piano-roll-canvas"
      width="640"
      height="340"
      @mousemove="onMouseMove"
      @mousedown="onMouseDown"
      @mouseup="onMouseUp"
    ></canvas>
    <!--</VuePerfectScrollbar>-->
  </v-container>
</template>

<style lang="scss">
.scroll-area {
  position: relative;
  margin: auto;
  width: 400px;
  height: 300px;
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

export default {
  name: "PianoRoll",
  components: {
    //VuePerfectScrollbar,
  },
  data() {
    return {
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
      return this.canvas?.getContext("2d");
    }
  },
  watch: {
    backupFile() { this.updatePatternNotes(); this.render(); },
    patternGroup() { this.updatePatternNotes(); this.render(); },
    patternSection() { this.updatePatternNotes(); this.render(); },
    pattern() { this.updatePatternNotes(); this.render(); }
  },
  mounted() {
    this.updatePatternNotes();
    //addEventListener("resize", () => console.log("resize"));
    setInterval(() => {
      this.render();
    }, 1000);

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
  methods: {
    updatePatternNotes() {
      this.notes = [];
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
        //const hexAddress = "0x" + (address >>> 0).toString(16).padStart(4, "0");
        //console.log(`${i.toString().padStart(2)}: ${hexAddress}: ${noteLabels[noteData & 0x7]}:${attribData}`);
        this.notes.push({
          note: noteData,
          pos: i,
          length: 1,
          up: (attribData & 0x02) !== 0,
          down: (attribData & 0x01) !== 0,
          acc: (attribData & 0x04) !== 0,
          slide: (attribData & 0x08) !== 0,
          time: 0,
        });
      }
    },
    render() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const w = ctx.canvas.clientWidth;
      const h = ctx.canvas.clientHeight;

      ctx.beginPath();
      ctx.clearRect(0, 0, w, h);
      this.renderGrid(ctx, w, h);
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
        text: "Time",
        style: this.gridStyles.labelText,
      });
      ctx.restore();

      // Notes.
      const cw = rowSize.width / 17;
      for (let i = 0; i < this.notes.length; ++i) {
        const selected = (this.selection && (this.selection.x == (i + 1)));
        const note = this.notes[i];
        const row = note.note !== 0xf ? (this.gridPitches.length - 1) - note.note : 18;
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
    /* eslint-disable no-unused-vars */
    renderNote(ctx, size, style) {
      this.renderCell(ctx, size, style);
    },
    /* eslint-enable no-unused-vars */
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
        /* eslint-disable no-console */
        //console.log(this.ctx);
        //console.log(evt);
        this.selection = { x: cell, y: row };
        console.log(`x: ${cell} y: ${row}`);
        //this.$emit("mouse-move", evt);
        /* eslint-enable no-console */
      }
      else
      {
        this.selection = null;
      }
    },
    onMouseDown(evt) {
      this.$emit("mouse-down", evt);
    },
    onMouseUp(evt) {
      this.$emit("mouse-up", evt);
    },
    scrollX(evt) {
      /* eslint-disable no-console */
      console.log(evt);
      /* eslint-enable no-console */
    },
    scrollY(evt) {
      /* eslint-disable no-console */
      console.log(evt);
      /* eslint-enable no-console */
    },
  },
};
</script>
