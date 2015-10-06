'use strict';

import TangramPlay from 'app/TangramPlay';

// Load some common functions
import { httpGet, debounce, subscribeMixin } from 'app/core/common';
import { isStrEmpty } from 'app/core/codemirror/tools';

// Load addons modules
import WidgetType from 'app/addons/widgets/WidgetType';

var stopAction = debounce(function(wm) {
    wm.reload();
}, 100);

export default class WidgetsManager {
    constructor(configFile) {
        subscribeMixin(this);

        this.data = []; // tokens to check

        this.totalLines = 0; // keep track of linesf
        this.pairedUntilLine = 0;

        // Load data file
        httpGet(configFile, (err, res) => {
            let widgetsData = JSON.parse(res)['values'];

            // Initialize tokens
            for (let datum of widgetsData) {
                if (datum.type === "color" || datum.type === "boolean" || datum.type === "string") {
                    this.data.push(new WidgetType(datum));
                }
            }

            // Build all widgets
            this.create({ line:0, ch:0 },
                        {
                            line: TangramPlay.editor.getDoc().size-1,
                            ch: TangramPlay.editor.getLine(TangramPlay.editor.getDoc().size-1).length
                        });
        });

        // If something change only update that
        TangramPlay.editor.on('changes', (cm, changesObjs) => {
            // console.log(changesObjs);
            for (let obj of changesObjs) {
                let from = obj.from;
                let to = obj.to;

                // Erase the widgets for the edited area
                // console.log("Clear",from,to);
                this.clear(from,to);

                // If the changes add or erase new lines
                // ( because the removed and added lines don't match )
                if (obj.removed.length !== obj.text.length) {
                    to.line = obj.from.line + obj.text.length-1;
                    to.ch = TangramPlay.editor.getLine(to.line).length;
                }

                // console.log("Create",from,to);
                this.create(from,to);
            }
        });

        // Keep track of possible NOT-PARSED lines
        // and in every codemirror "render update" check if we are aproaching a
        // non-parsed area and for it to update by cleaning and creating
        TangramPlay.editor.on('update', (cm) => {
            let horizon = TangramPlay.editor.getViewport().to-1;
            if (this.pairedUntilLine < horizon) {
                // console.log("PairedUntil",this.pairedUntilLine);
                this.pairedUntilLine = horizon;
                stopAction(this);
            }
        });

        // If a new files is loaded reset the tracked line
        TangramPlay.on('url_loaded', (url) => {
            this.pairedUntilLine = 0;
        })
    }

    create(from, to) {
        let keys = TangramPlay.getKeys(from,to);
        if (keys) {
            for (let key of keys) {
                let val = key.value;

                if (val === '|' || isStrEmpty(val) || isStrEmpty(TangramPlay.editor.getLine(key.pos.line))) {
                    continue;
                }

                // Check for widgets to add
                for (let datum of this.data) {
                    if (datum.match(key)) {
                        let widget = datum.create(key);
                        widget.insert();
                        break;
                    }
                }
            }
        }

    }

    clear(from, to) {
        // Delete widgets
        let bookmarks = TangramPlay.editor.getDoc().findMarks(from,to);
        for (let bkm of bookmarks) {
            bkm.clear();
        }
    }

    reload() {
        let bookmarks = TangramPlay.editor.getDoc().getAllMarks();
        for (let bkm of bookmarks) {
            bkm.clear();
        }

        let from = { line:0, ch:0 };
        let to = {  line: TangramPlay.editor.getDoc().size-1,
                    ch: TangramPlay.editor.getLine(TangramPlay.editor.getDoc().size-1).length };
        this.create(from,to);
    }
}
