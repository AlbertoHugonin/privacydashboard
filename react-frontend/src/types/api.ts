export type Role = "SUBJECT" | "CONTROLLER" | "DPO";

export type QuestionnaireVote = "RED" | "ORANGE" | "GREEN";

export interface Me {
  id: string;
  name: string;
  role: Role;
  mail?: string;
}

export interface UserSummary {
  id: string;
  name: string;
  role: Role;
  mail?: string;
}

export interface IoTApp {
  id: string;
  name: string;
  description?: string;
  questionnaireVote?: QuestionnaireVote;
  detailVote?: string[];
  optionalAnswers?: Array<string | null>;
  consenses?: string[];
}

export interface UserAppRelation {
  id: string;
  userName: string;
  userId: string;
  appName: string;
  appId: string;
  consenses?: string[];
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  text: string;
  time: string;
}

export interface Conversation {
  contactId: string;
  contactName: string;
  messages: Message[];
}

export interface PrivacyNotice {
  id: string;
  appname: string;
  appId: string;
  text: string;
}

export type RightType =
  | "WITHDRAWCONSENT"
  | "COMPLAIN"
  | "ERASURE"
  | "DELTEEVERYTHING"
  | "INFO"
  | "PORTABILITY";

export interface RightRequest {
  id: string;
  senderName: string;
  senderId: string;
  receiverName: string;
  receiverId: string;
  time?: string;
  appId?: string;
  appName?: string;
  rightType: RightType;
  other?: string;
  handled?: boolean;
  details?: string;
  response?: string;
}

export type NotificationType = "Message" | "Request" | "PrivacyNotice";

export interface Notification {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  description: string;
  type: NotificationType;
  objectId: string;
  time?: string;
  isRead?: boolean;
}
