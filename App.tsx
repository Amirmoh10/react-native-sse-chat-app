import React, { useState } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  Button,
  FlatList,
  Text,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import EventSource from "react-native-sse";
import { openaiApiKey } from "./utils";

type Message = {
  id: string;
  text: string;
  sender: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>("");

  const startEventSource = (conversation: Message[]) => {
    const es = new EventSource("https://api.openai.com/v1/chat/completions", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      method: "POST",
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          ...conversation.map((msg) => ({
            role: msg.sender === "user" ? "user" : "assistant",
            content: msg.text,
          })),
        ],
        max_tokens: 600,
        temperature: 0.7,
        stream: true,
      }),
      pollingInterval: 0,
    });

    let assistantMessage = {
      id: (Date.now() + 1).toString(),
      text: "",
      sender: "assistant",
    };
    setMessages((prevMessages) => [...prevMessages, assistantMessage]);

    es.addEventListener("message", (event) => {
      if (event.data && event.data !== "[DONE]") {
        const data = JSON.parse(event.data);
        if (data.choices[0].delta.content) {
          assistantMessage.text += data.choices[0].delta.content;
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === assistantMessage.id ? assistantMessage : msg
            )
          );
        }
      } else {
        es.close();
      }
    });

    es.addEventListener("error", (error) => {
      console.error("EventSource error:", error);
      es.close();
    });
  };

  const sendMessage = () => {
    if (inputText.trim() === "") return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: "user",
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    setInputText("");

    startEventSource([...messages, userMessage]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={messages}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageBubble,
                item.sender === "user" ? styles.userBubble : styles.botBubble,
              ]}
            >
              <Text style={styles.messageText}>{item.text}</Text>
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
          />
          <Button title="Send" onPress={sendMessage} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6",
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#ECE5DD",
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 8,
    borderTopWidth: 1,
    borderColor: "#CCC",
    alignItems: "center",
  },
  input: {
    flex: 1,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 25,
  },
});
