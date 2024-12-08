//@ts-ignore
import { Ok, Error } from './gleam.mjs';
import PartySocket from "partysocket";

// connect to our server
const partySocket = new PartySocket({
    host: "local_host:1999",
    room: "my-room"
});
// partySocket.addEventListener("connect", (e) => {

// })
partySocket.addEventListener("message", (e) => {

    window.localStorage.setItem("kanban", e.data)
    document.getElementById("websocket_element")?.dispatchEvent(
        new CustomEvent('content-updated', {
            detail: {
                kanban: JSON.parse(e.data)
            },
            bubbles: true, // Allows the event to bubble up the DOM
            composed: true, // Allows the event to cross the shadow DOM boundary (if present)
        })
    );

});
export function read_local_storage(key) {
    const value = window.localStorage.getItem(key)

    let string = JSON.parse(value!)

    // console.log(string)

    return string ? new Ok(string) : new Error(undefined);
}

export function write_local_storage(key, value) {


    const value2 = JSON.stringify(value)
    partySocket.send(value2);

    window.localStorage.setItem(key, value2)
}
