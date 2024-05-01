import { createApp } from 'vue';

const oldMessages = localStorage.getItem('messages') ? JSON.parse(localStorage.getItem('messages')) : {'858': []};
const currentChannel = 858
let name = localStorage.getItem('username') ? localStorage.getItem('username') : prompt('Please use your github username');
document.querySelector('.bg-start').remove();
if (name.length == 0) name = `user-${Math.floor(Math.random() * 100)}`

createApp({
  data() {
    return {
      messages: oldMessages,
      members: {},
      currentChannel: currentChannel,
      author: name,
      messageToReply: false
    }
  },
  mounted() {
    localStorage.setItem('username', name)
    setInterval(() => { Object.keys(this.messages).forEach(channel => this.fetchMessages(channel)) }, 1000);
  },
  methods: {
    fetchMessages(channel) {
      const url = `https://wagon-chat.herokuapp.com/${channel}/messages`;
      fetch(url)
        .then(response => response.json())
        .then(data=> {
          const previousChannelMsgs = this.messages[channel]
          if (previousChannelMsgs.length > 0) {
            const newMessages = data.messages.filter(msg=> msg.id > previousChannelMsgs[previousChannelMsgs.length - 1].id)
            this.messages[channel] = [...previousChannelMsgs, ...newMessages]
            // if (newMessages.length > 0) this.moveToMsg(this.lastMsgId(channel));
          } else {
            this.messages[channel] = data.messages;
          }
          this.members[channel] = this.getMembers(this.messages[channel]);
          localStorage.setItem('messages', JSON.stringify(this.messages));
        });
    },
    sendMessage(e) {
      const url = `https://wagon-chat.herokuapp.com/${this.currentChannel}/messages`;
      const input = e.target
      const isReply = this.messageToReply ? `<span hidden>reply-${this.messageToReply}</span>` : ''
      if (e.key == 'Enter' && this.author) {
        fetch(url, {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({author: this.author, content: `${isReply}${input.value}`})
        }).then(response=>response.json()).then(data=>{
          input.value = ''
          this.messageToReply = false;
          const lastPost = data.id
          setTimeout(() => {
            this.moveToMsg(lastPost);
          }, 1000);
        })
      }
    },
    setChannel(e) { this.currentChannel = e.target.id },
    isAuthor(message) { return message.author == this.author},
    getMembers(messages) {
      if (!messages) return []
      const members = messages.map((msg) => {return msg.author})
      return [...new Set(members)]
    },
    showMemberCount() { return `Members (${this.members[this.currentChannel] ? this.members[this.currentChannel].length : 0})` },
    createNewChannel() {
      const channel = prompt("Please enter the batch number", "000");
      if (channel !== null && channel !== "") { this.messages[channel] = [] }
    },
    generateTimestamp(msg) {
      const minutesAgo = Math.round((Date.now() - Date.parse(msg.created_at))/60000)
      if (minutesAgo >= 720) {
        const days = Math.floor(minutesAgo / 720);
        return days == 1 ? 'yesterday' : `${days}d ago`;
      } else if (minutesAgo >= 60) {
        const msgTime = new Date(msg.created_at)
        const hours = msgTime.getHours();
        const minutes = msgTime.getMinutes();
        const currentTime = new Date(Date.now());
        // if (currentTime < msgTime) {
        //   return `yesterday at ${hours}:${minutes.toString().length == 1 ? `0${minutes}` : minutes}`
        // } else {
        //   return `${hours}:${minutes.toString().length == 1 ? `0${minutes}` : minutes}`
        // }
        return `${Math.floor(minutesAgo / 60)}h ago`
      } else if (minutesAgo == 0) {
        return 'now';
      } else {
        return `${minutesAgo}m ago`;
      }
    },
    generateMemberTimestamp(member, channel) {
      const memberMsgs = this.messages[channel].filter((msg) => msg.author == member);
      const lastMsg = memberMsgs.sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
      return this.generateTimestamp(lastMsg)
    },
    lastMsgFromMember(member, channel) {
      const memberMsgs = this.messages[channel].filter((msg) => msg.author == member);
      const lastMsg = memberMsgs.sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
      return lastMsg.id
    },
    lastMsgId(channel) {
      return this.messages[channel][this.messages[channel].length - 1].id
    },
    moveToMsg(id) {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView();
    },
    triggerReply(id) {
      this.messageToReply = id;
      document.querySelector('#message').focus()
    },
    copyReply() {
      if (this.messageToReply) {
        const msgReplied = this.messages[this.currentChannel].filter(msg => msg?.id == Number(this.messageToReply))[0];
        return `<div class="reply-view">
                  <div>
                    <p class="msg-author">${ msgReplied.author } <small class="posted-time">${this.generateTimestamp(msgReplied)}</small></p>
                    <p class="msg-content">${ msgReplied.content }</p>
                  </div>
                </div>`
      } else {
        return ''
      }
    },
    replySignal() {
      if (!this.messages[this.currentChannel]) return ''
      const replyTo = this.messages[this.currentChannel].filter(msg=>msg.id == this.messageToReply);
      if (replyTo.length === 1) {
        return `↪`
      } else {
        return ''
      }
    },
    cancelReply() {
      this.messageToReply = false
    },
    checkReply(msg) {
      const msgId = msg.match(/reply-(\d+)/);
      if (msgId) {
        const id = msgId[1];
        const msgReplied = this.messages[this.currentChannel].filter(msg => msg?.id == Number(id))[0];
        if (msgReplied) {
          const msgContent = msg.replaceAll(/<\w+ \w+>reply-\d+<\/\w+>/g, '');
          const reply = `<a href="#${msgReplied.id}" class="bubble">
                          <div>
                            <p class="msg-author">${ this.cleanContent(msgReplied.author) } <small class="posted-time">${this.generateTimestamp(msgReplied)}</small></p>
                            <p class="msg-content">${ this.cleanContent(msgReplied.content) }</p>
                          </div>
                        </a>
                        <p class="msg-content">${ this.cleanContent(msgContent) }</p>`
          return reply
        } else {
          return this.cleanContent(msg)
        }
      } else {
        return this.cleanContent(msg)
      }
    },
    closeChannel() {
      if (Object.keys(this.messages).length == 1) {
        alert('You need at least 1 channel open!')
      } else {
        if (confirm('Are you sure you want to close this tab?')) {
          const remainingChannels = Object.keys(this.messages).filter(channel => Number(channel) == this.currentChannel)
          delete this.messages[this.currentChannel];
          this.currentChannel = remainingChannels[0];
        }
      }
    },
    darkmode() {
      document.getElementById('app').classList.toggle('darkmode');
    },
    cleanContent(string) {
      const cleanString = string.replace(/<\/?[^>]+(>|$)/g, "");
      return cleanString.trim().length === 0 ? '<span style="color: firebrick">[content removed]</span>' : cleanString
    }
  }
}).mount('#app')