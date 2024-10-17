import { WASocket } from '@whiskeysockets/baileys';

export class KeyStorage {
    publicKey: string = ""
    privateKey: string = ""
    clientKey: Buffer = {} as Buffer;
};

export class User {
    socket: WASocket = {} as WASocket;
    connection: string = "";
    why: string = "";
    keys: KeyStorage = new KeyStorage();
    credsAvailible: boolean = false;
    creds: { [key: string]: any } = {};
    storageUpdated: boolean = false;
    updates: Array<{ type: string, content: any }> = [];
    store: any = {};

    toJSON() {
        if (this.connection === "closed") {
            return { why: this.why };
        } else if (this.connection === "opened") {
            let updatesCopy = Object.assign({}, this.updates);
            this.updates = []
            return {
                connection: this.connection,
                credsAvailible: this.credsAvailible,
                storageUpdated: this.storageUpdated,
                updates: updatesCopy
            };
        }
        return {};
    }
}

export type UsersMap = Map<string, User>;

export const users: UsersMap = new Map<string, User>();

