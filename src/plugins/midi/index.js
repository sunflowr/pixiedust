import { install } from './install';

export default class WebMIDI {
    constructor(options) {
        this.options = options;
    }
}

WebMIDI.install = install;
