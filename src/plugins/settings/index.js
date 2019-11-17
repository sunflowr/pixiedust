import { install } from './install';

export default class Settings {
    constructor(options) {
        this.options = options;
    }
}

Settings.install = install;
