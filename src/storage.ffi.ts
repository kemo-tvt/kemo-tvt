//@ts-ignore
import { Ok, Error } from './gleam.mjs';


// connect to our server
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";

const yDoc = new Y.Doc();

const provider = new YPartyKitProvider(
    "https://store.kemo-1.partykit.dev",
    "my-document",
    yDoc
);

provider.doc.on("update", () => {

    let array = provider.doc.getMap('data').get('kanban');
    let json_array = JSON.stringify(array);
    window.localStorage.setItem("kanban", json_array)

    document.getElementById("websocket_element")?.dispatchEvent(
        new CustomEvent('content-updated', {
            detail: {
                kanban: array
            },
            bubbles: true, // Allows the event to bubble up the DOM
            composed: true, // Allows the event to cross the shadow DOM boundary (if present)
        })
    );

})


export function read_local_storage(key) {

    let array = provider.doc.getMap('data').get('kanban');

    let json_array = JSON.stringify(array);
    window.localStorage.setItem("kanban", json_array)

    const value = window.localStorage.getItem(key)

    let string = JSON.parse(value!)

    // console.log(string)

    return string ? new Ok(string) : new Error(undefined);
}

export function write_local_storage(key, value) {


    // yDoc.transact(
    //     => (),    yDoc.getArray("kanban").push(value)


    // )
    yDoc.getMap("data").set("kanban", value)
    const value2 = JSON.stringify(value)

    // partySocket.send(value2);

    window.localStorage.setItem(key, value2)
}
