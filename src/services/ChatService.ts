import {
  ref,
  get,
  set,
  push,
  child,
  remove,
  onValue,
  onChildAdded,
  DatabaseReference,
  DataSnapshot,
  Unsubscribe,
} from "firebase/database";
import { IChat } from "../interfaces/chat";
import { IMessage } from "../interfaces/message";
import firebaseUtils from "../utils/FirebaseUtils";

export class ChatService {
  private readonly nodeChat: string = "chats";
  private readonly nodeMessages: string = "messages";

  public rootRef: DatabaseReference;

  constructor() {
    this.rootRef = ref(firebaseUtils.database, this.nodeChat);
  }

  private mapChat(data: any): IChat {
    const messages = data["messages"];
    return {
      email: data["email"],
      chatId: data["chatId"],
      asunto: data["assunto"],
      userName: data["userName"],
      messages: Object.keys(messages).map((k) => {
        const m = messages[k] as IMessage;
        m.id = k;
        return m;
      }),
    } as IChat;
  }

  async createChat(data: IChat): Promise<void> {
    data.timestamp = new Date().toJSON();
    const newChat = child(this.rootRef, `${data.chatId}`);
    return await set(newChat, data);
  }

  async removeChat(chatKey: string): Promise<void> {
    const chatRef = child(this.rootRef, chatKey);
    return remove(chatRef);
  }

  async getChat(chatKey: string): Promise<IChat | null> {
    const chatRef = child(this.rootRef, chatKey);
    const snapshot = await get(chatRef);

    if (snapshot.exists()) {
      const data = await snapshot.val();
      return this.mapChat(data);
    }

    return null;
  }

  async getChats(): Promise<IChat[]> {
    const chats: IChat[] = [];
    const snapshot = await get(this.rootRef);

    if (snapshot.exists()) {
      snapshot.forEach((chat: DataSnapshot) => {
        const data = chat.val();
        chats.push(this.mapChat(data));
      });
    }

    return chats;
  }

  async getMessages(chatKey: string): Promise<IMessage[]> {
    const chatRef = child(this.rootRef, `${chatKey}/${this.nodeMessages}`);
    const snapshot = await get(chatRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }

    return Promise.resolve([]);
  }

  async sendMessage(chatKey: string, data: IMessage): Promise<void> {
    data.timestamp = new Date().toJSON();
    const chatRef = child(this.rootRef, `${chatKey}/${this.nodeMessages}`);
    const newMessage = push(chatRef);
    return set(newMessage, data);
  }

  onAddMessage(chatKey: string, onAdd: (data: IMessage) => void): Unsubscribe {
    const chatRef = child(this.rootRef, `${chatKey}/messages`);
    const callback = (data: DataSnapshot) => {
      onAdd(data.val() as IMessage);
    };
    return onChildAdded(chatRef, callback);
  }

  onChangeMessage(
    chatKey: string,
    onChange: (data: IMessage[]) => void
  ): Unsubscribe {
    const chatRef = child(this.rootRef, chatKey);
    const callback = (data: DataSnapshot) => {
      const messages: IMessage[] = [];
      data.forEach((m) => {
        messages.push(m.val() as IMessage);
      });
      onChange(messages);
    };
    return onValue(chatRef, callback);
  }
}