//@ts-ignore

import { main } from './src/kemotvt.gleam'

import { TiptapEditor } from './src/editor/index'
customElements.define('tiptap-editor', TiptapEditor);
document.addEventListener("DOMContentLoaded", () => {
    const dispatch = main({});



});
