import Vue from 'vue';

import bem from './bem';
import bemElement from './bem-element';
import bemMods from './bem-mods';
import duration from './duration';
import fileSize from './file-size';

Vue.filter('bem', bem);
Vue.filter('bemElement', bemElement);
Vue.filter('bemMods', bemMods);
Vue.filter('duration', duration);
Vue.filter('fileSize', fileSize);
