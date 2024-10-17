import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, getAggregateVotesInPollMessage, makeInMemoryStore, proto, WAMessageContent, WAMessageKey } from '@whiskeysockets/baileys';
import { useSingleFileAuthState } from '../dbSave';
import { Boom } from '@hapi/boom';
import { users } from '../types';


const content = (message: any) => typeof message === 'object' ? JSON.stringify(message) : String(message);

export const startSock = async (session: string) => {
    let user = users.get(session);

    let updateTimeout: NodeJS.Timeout | null = null;
    const { state, saveCreds } = await useSingleFileAuthState(session+"-creds.json");

    const store = makeInMemoryStore({ });
    store.readFromFile('./session_stuff/' + session + '_storage.json');
    setInterval(() => {
        store.writeToFile('./session_stuff/' + session + '_storage.json');
    }, 10_000);

    user!.store = store;

    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: state.keys
        },
        generateHighQualityLinkPreview: true,
    });
    store.bind(sock.ev);
    user!.socket = sock;

    sock.ev.process(
        async (events) => {
            if (events['connection.update']) {
                const update = events['connection.update'];
                const { connection, lastDisconnect } = update;
                if (connection === 'close') {
                    if ((lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
                        startSock(session);
                    } else {
                        user!.connection = "closed";
                        user!.why = "logged out";
                    }
                } else {
                    user!.connection = "opened";
                }
                user!.updates.push({ type: 'connection.update', content: content(update) });
            }

            if (events['creds.update']) {
                let jsonCreds = await saveCreds();
                if (updateTimeout) {
                    clearTimeout(updateTimeout);
                }
                updateTimeout = setTimeout(async () => {
                    user!.credsAvailible = true;
                }, 10_000);
            }

            if (events['labels.association']) {
                user!.updates.push({ type: 'labels.association', content: content(events['labels.association']) });
            }

            if (events['labels.edit']) {
                user!.updates.push({ type: 'labels.edit', content: content(events['labels.edit']) });
            }

            if (events.call) {
                user!.updates.push({ type: 'recv call event', content: content(events.call) });
            }

            if (events['messaging-history.set']) {
                const { chats, contacts, messages, isLatest, progress, syncType } = events['messaging-history.set'];
                if (syncType === proto.HistorySync.HistorySyncType.ON_DEMAND) {
                    user!.updates.push({ type: 'received on-demand history sync', content: content(messages) });
                }
                user!.updates.push({ type: 'messaging-history.set', content: content(`recv ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs (is latest: ${isLatest}, progress: ${progress}%), type: ${syncType}`) });
            }

            if (events['messages.upsert']) {
                const upsert = events['messages.upsert'];
                for (const msg of upsert.messages) {
                    user!.updates.push({ type: 'messages.upsert', content: content({ "message": msg }) });
                }
            }

            if (events['messages.update']) {
                user!.updates.push({ type: 'messages.update', content: content(JSON.stringify(events['messages.update'], undefined, 2)) });

                for (const { key, update } of events['messages.update']) {
                    if (update.pollUpdates) {
                        const pollCreation = await getMessage(key);
                        if (pollCreation) {
                            user!.updates.push({
                                type: 'got poll update, aggregation',
                                content: content(getAggregateVotesInPollMessage({
                                    message: pollCreation,
                                    pollUpdates: update.pollUpdates,
                                }))
                            });
                        }
                    }
                }
            }

            if (events['message-receipt.update']) {
                user!.updates.push({ type: 'message-receipt.update', content: content(events['message-receipt.update']) });
            }

            if (events['messages.reaction']) {
                user!.updates.push({ type: 'messages.reaction', content: content(events['messages.reaction']) });
            }

            if (events['presence.update']) {
                user!.updates.push({ type: 'presence.update', content: content(events['presence.update']) });
            }

            if (events['chats.update']) {
                user!.updates.push({ type: 'chats.update', content: content(events['chats.update']) });
            }

            if (events['chats.upsert']) {
                user!.updates.push({ type: 'chats.upsert', content: content(events['chats.upsert']) });
            }

            if (events['contacts.update']) {
                for (const contact of events['contacts.update']) {
                    if (typeof contact.imgUrl !== 'undefined') {
                        const newUrl = contact.imgUrl === null
                            ? null
                            : await sock!.profilePictureUrl(contact.id!).catch(() => null);
                        user!.updates.push({ type: 'contacts.update', content: content(`contact ${contact.id} has a new profile pic: ${newUrl}`) });
                    }
                }
            }

            if (events['contacts.upsert']) {
                user!.updates.push({ type: 'contacts.upsert', content: content(events['contacts.upsert']) });
            }

            if (events['chats.delete']) {
                user!.updates.push({ type: 'chats.delete', content: content(events['chats.delete']) });
            }
        }
    );

    async function getMessage(key: WAMessageKey): Promise<WAMessageContent | undefined> {
        return proto.Message.fromObject({});
    }
};
