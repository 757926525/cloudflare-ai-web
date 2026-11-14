"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "zh" | "en";

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  zh: {
    welcome: "今天有什么我可以协助您的吗？",
    welcomeSubtitle: "支持 Cloudflare Workers AI、DeepSeek、Groq 等多模型极速对话与编程辅助",
    placeholder: "输入问题或需求，直接回车发送，支持粘贴图片与上传.zip压缩包...",
    send: "发送",
    stop: "停止",
    thinking: "正在思考并生成回复...",
    newChat: "新对话",
    settings: "设置与 API 密钥",
    imageGen: "AI 绘图生成",
    clearHistory: "清空绘图记录",
    deleteChat: "删除对话",
    deleteConfirm: "确认要删除此会话记录吗？",
    deleteDesc: "删除后该会话中的所有聊天记录将无法恢复。",
    cancel: "取消",
    confirm: "确认",
    adminLogin: "管理员登录",
    adminSettings: "管理员后台与 API 配置",
    connectRepo: "连接代码仓库",
    changeRepo: "切换仓库",
    pushCode: "推送代码",
    disconnect: "取消连接",
    noRepo: "未连接代码仓库 (只读模式)",
    readAloud: "语音朗读回复",
    stopReading: "停止朗读",
    downloadZip: "打包下载代码 (.zip)",
    deleteMsg: "删除此消息",
  },
  en: {
    welcome: "How can I assist you today?",
    welcomeSubtitle: "Supporting Cloudflare Workers AI, DeepSeek, Groq and more with high-speed coding assistance",
    placeholder: "Type a prompt or code, press Enter to send, paste images or upload .zip files...",
    send: "Send",
    stop: "Stop",
    thinking: "Thinking and generating response...",
    newChat: "New Chat",
    settings: "Settings & API Keys",
    imageGen: "AI Image Generation",
    clearHistory: "Clear image history",
    deleteChat: "Delete session",
    deleteConfirm: "Are you sure you want to delete this session?",
    deleteDesc: "This action cannot be undone.",
    cancel: "Cancel",
    confirm: "Confirm",
    adminLogin: "Admin Login",
    adminSettings: "Admin Settings & APIs",
    connectRepo: "Connect Repo",
    changeRepo: "Change Repo",
    pushCode: "Push Code",
    disconnect: "Disconnect",
    noRepo: "No repository connected (read-only)",
    readAloud: "Read aloud",
    stopReading: "Stop reading",
    downloadZip: "Download code (.zip)",
    deleteMsg: "Delete message",
  },
};

const I18nContext = createContext<I18nContextType>({
  lang: "zh",
  setLang: () => {},
  t: (key) => key,
});

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Language>("zh");

  useEffect(() => {
    const stored = localStorage.getItem("APP_LANG") as Language;
    if (stored === "en" || stored === "zh") {
      setLangState(stored);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("APP_LANG", newLang);
  };

  const t = (key: string) => {
    return translations[lang]?.[key] || translations.zh[key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
