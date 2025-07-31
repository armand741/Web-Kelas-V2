import React, { useState, useEffect, useRef } from "react";
import { supabase, auth } from "../supabase";
import axios from "axios";
import Swal from "sweetalert2";

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [userIp, setUserIp] = useState("");
  const [messageCount, setMessageCount] = useState(0);
  const [user, setUser] = useState(null);

  const messagesEndRef = useRef(null);

  // Fungsi untuk mengambil daftar alamat IP yang diblokir dari Supabase
  const fetchBlockedIPs = async () => {
    try {
      let { data, error } = await supabase.from("blacklist_ips").select("ipAddress");
      if (error) throw error;
      const blockedIPs = data.map((item) => item.ipAddress);
      return blockedIPs;
    } catch (error) {
      console.error("Gagal mengambil daftar IP yang diblokir:", error);
      return [];
    }
  };

  useEffect(() => {
    // Get current user from Supabase auth
    const getUser = async () => {
      const { data, error } = await auth.getUser();
      if (error) {
        console.error("Error getting user:", error);
        setUser(null);
      } else {
        setUser(data.user);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    // Memuat pesan dari Supabase dan mengatur langganan untuk memantau perubahan
    const subscription = supabase
      .from("chats")
      .select("*")
      .order("timestamp", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching chats:", error);
          return;
        }
        setMessages(data);
        if (shouldScrollToBottom) {
          scrollToBottom();
        }
      });

    const realtimeSubscription = supabase
      .channel('public:chats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, (payload) => {
        setMessages((prevMessages) => [...prevMessages, payload.new]);
        if (shouldScrollToBottom) {
          scrollToBottom();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeSubscription);
    };
  }, [shouldScrollToBottom]);

  useEffect(() => {
    // Mengambil alamat IP pengguna dan memeriksa batasan pesan
    getUserIp();
    checkMessageCount();
    scrollToBottom();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 100);
  };

  const getUserIp = async () => {
    try {
      // Cek apakah alamat IP sudah disimpan di localStorage
      const cachedIp = localStorage.getItem("userIp");
      if (cachedIp) {
        setUserIp(cachedIp);
        return;
      }
      // Jika tidak ada di localStorage, ambil alamat IP dari API eksternal
      const response = await axios.get("https://ipapi.co/json");
      const newUserIp = response.data.network;
      setUserIp(newUserIp);
      // Simpan alamat IP dalam localStorage dengan waktu kedaluwarsa (misalnya, 1 jam)
      const expirationTime = new Date().getTime() + 60 * 60 * 1000; // 1 jam
      localStorage.setItem("userIp", newUserIp);
      localStorage.setItem("ipExpiration", expirationTime.toString());
    } catch (error) {
      console.error("Gagal mendapatkan alamat IP:", error);
    }
  };

  const checkMessageCount = () => {
    const userIpAddress = userIp;
    const currentDate = new Date();
    const currentDateString = currentDate.toDateString();
    const storedDateString = localStorage.getItem("messageCountDate");

    if (currentDateString === storedDateString) {
      // Jika tanggal saat ini sama dengan tanggal yang disimpan, periksa batasan pesan
      const userSentMessageCount = parseInt(localStorage.getItem(userIpAddress)) || 0;
      if (userSentMessageCount >= 20) {
        Swal.fire({
          icon: "error",
          title: "Message limit exceeded",
          text: "You have reached your daily message limit.",
          customClass: {
            container: "sweet-alert-container",
          },
        });
      } else {
        setMessageCount(userSentMessageCount);
      }
    } else {
      // Jika tanggal berbeda, bersihkan data penghitungan pesan sebelumnya
      localStorage.removeItem(userIpAddress);
      localStorage.setItem("messageCountDate", currentDateString);
    }
  };

  // Fungsi untuk memeriksa apakah alamat IP pengguna ada dalam daftar hitam
  const isIpBlocked = async () => {
    const blockedIPs = await fetchBlockedIPs();
    return blockedIPs.includes(userIp);
  };

  const sendMessage = async () => {
    if (message.trim() !== "") {
      // Memanggil isIpBlocked untuk memeriksa apakah pengguna diblokir
      const isBlocked = await isIpBlocked();

      if (isBlocked) {
        Swal.fire({
          icon: "error",
          title: "Blocked",
          text: "You are blocked from sending messages.",
          customClass: {
            container: "sweet-alert-container",
          },
        });
        return;
      }

      const senderImageURL = user?.user_metadata?.avatar_url || "/AnonimUser.png";
      const trimmedMessage = message.trim().substring(0, 60);
      const userIpAddress = userIp;

      if (messageCount >= 20) {
        Swal.fire({
          icon: "error",
          title: "Message limit exceeded",
          text: "You have reached your daily message limit.",
          customClass: {
            container: "sweet-alert-container",
          },
        });
        return;
      }

      const updatedSentMessageCount = messageCount + 1;
      localStorage.setItem(userIpAddress, updatedSentMessageCount.toString());
      setMessageCount(updatedSentMessageCount);

      // Menambahkan pesan ke Supabase
      const { error } = await supabase.from("chats").insert([
        {
          message: trimmedMessage,
          sender: {
            image: senderImageURL,
          },
          timestamp: new Date(),
          userIp: userIp,
        },
      ]);

      if (error) {
        console.error("Error sending message:", error);
        Swal.fire({
          icon: "error",
          title: "Error sending message",
          text: error.message || "Failed to send message.",
          customClass: {
            container: "sweet-alert-container",
          },
        });
        return;
      }

      setMessage(""); // Menghapus pesan setelah mengirim
      setTimeout(() => {
        setShouldScrollToBottom(true);
      }, 100);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="" id="ChatAnonim">
      <div className="text-center text-4xl font-semibold" id="Glow">
        Text Anonim
      </div>

      <div className="mt-5" id="KotakPesan" style={{ overflowY: "auto" }}>
        {messages.map((msg, index) => (
          <div key={index} className="flex items-start text-sm py-[1%]">
            <img src={msg.sender.image} alt="User Profile" className="h-7 w-7 mr-2 " />
            <div className="relative top-[0.30rem]">{msg.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>
      <div id="InputChat" className="flex items-center mt-5">
        <input
          className="bg-transparent flex-grow pr-4 w-4 placeholder:text-white placeholder:opacity-60"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ketik pesan Anda..."
          maxLength={60}
        />
        <button onClick={sendMessage} className="ml-2">
          <img src="/paper-plane.png" alt="" className="h-4 w-4 lg:h-6 lg:w-6" />
        </button>
      </div>
    </div>
  );
}

export default Chat;
