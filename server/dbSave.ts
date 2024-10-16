import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from '../src/Types';
import { initAuthCreds } from '../src/Utils/auth-utils';
import { BufferJSON } from '../src/Utils/generics';

export const useSingleFileAuthState = async (filename: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => {
    const folder = './session_stuff';
    const filePath = join(folder, filename);
  
    await mkdir(folder, { recursive: true });
  
    const readData = async () => {
      try {
        const data = await readFile(filePath, { encoding: 'utf-8' });
        return JSON.parse(data, BufferJSON.reviver);
      } catch (error) {
        return { creds: initAuthCreds(), keys: {} };
      }
    };
  
    const writeData = async (data: any) => {
      await writeFile(filePath, JSON.stringify(data, BufferJSON.replacer));
    };
  
    const { creds, keys } = await readData();
  
    return {
      state: {
        creds,
        keys: {
          get: async (type, ids) => {
            const data: { [_: string]: SignalDataTypeMap[typeof type] } = {};
            await Promise.all(ids.map(async id => {
              const value = keys[`${type}-${id}`];
              data[id] = value;
            }));
            return data;
          },
          set: async (data) => {
            for (const category in data) {
              for (const id in data[category]) {
                keys[`${category}-${id}`] = data[category][id];
              }
            }
            await writeData({ creds, keys });
          }
        }
      },
      saveCreds: async () => {
        await writeData({ creds, keys });
      }
    };
  };