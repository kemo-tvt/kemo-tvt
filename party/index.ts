import type * as Party from "partykit/server";

export default class WebSocketServer implements Party.Server {
  constructor(readonly room: Party.Room) { }
  onMessage(message: string, sender: Party.Connection) {
    this.room.broadcast(message, [sender.id]);
  }
}