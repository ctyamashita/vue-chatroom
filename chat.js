import { createApp } from 'vue';
import Swal from 'sweetalert2';

let name = localStorage.getItem('username')

if (name === 'null' || name === null || name === undefined) {
  let { value: newName } = await Swal.fire({
    input: "text",
    inputLabel: "Use your github name",
    inputPlaceholder: "user-00"
  });
  if (newName === 'null' || newName.length === 0) newName = `user-${Math.floor(Math.random() * 10000)}`
  name = newName
}
document.querySelector('.bg-start').remove();

const oldMessages = localStorage.getItem('messages') ? JSON.parse(localStorage.getItem('messages')) : {'858': []};
const currentChannel = 858

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
    this.currentChannel = Object.keys(this.messages)[0];
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
      if (e.key === 'Enter' && input.value.length > 0 && this.author) {
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
    showMemberCount() { return `<i class="fa-solid fa-user-group"></i> (${this.members[this.currentChannel] ? this.members[this.currentChannel].length : 0})` },
    async createNewChannel() {
      let { value: channel } = await Swal.fire({
        input: "number",
        inputLabel: "Input batch number",
        inputPlaceholder: "000"
      });
      if (channel !== null && channel !== "" && channel !== undefined) { this.messages[channel] = [] }
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
        return `<i class="fa-solid fa-reply" style="rotate: 180deg"></i>`
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
                            <p class="msg-author">${ this.removeTags(msgReplied.author) } <small class="posted-time">${this.generateTimestamp(msgReplied)}</small></p>
                            <p class="msg-content">${ msgReplied.content.replaceAll(/<\w+ \w+>reply-\d+<\/\w+>/g, '') }</p>
                          </div>
                        </a>
                        <p class="msg-content">${ this.removeTags(msgContent) }</p>`
          return reply
        } else {
          return this.removeTags(msg)
        }
      } else {
        return this.removeTags(msg)
      }
    },
    checkLinks(string) {
      const links = string.match(/(https?:\/\/w{0,3}\.?[a-zA-Z0-9\-_\.\/?=&]+)/)
      let newString = string.split(' ');
      if (links && links.length > 0) return newString.map(word=>links.includes(word) ? `<a href="${word}" target="_blank" class="external-link">${word.split('/')[2]} <i class="fa-solid fa-arrow-up-right-from-square"></i>` : word).join(' ')
      return string
    },
    closeChannel() {
      if (Object.keys(this.messages).length === 1) {
        Swal.fire('You need at least 1 channel open!');
      } else {
        Swal.fire({
          title: "Are you sure?",
          showCancelButton: true,
          confirmButtonText: "Confirm",
          denyButtonText: `Cancel`
        }).then((result) => {
          /* Read more about isConfirmed, isDenied below */
          if (result.isConfirmed) {
            const remainingChannels = Object.keys(this.messages).filter(channel => Number(channel) == this.currentChannel)
          delete this.messages[this.currentChannel];
          this.currentChannel = remainingChannels[0];
          }
        });
      }
    },
    darkmode() {
      document.getElementById('app').classList.toggle('darkmode');
    },
    removeTags(string) {
      const cleanString = string.replace(/<\/?[^>]+(>|$)/g, "");
      return (cleanString.trim().length === 0 && string.length > 0) ? '<span style="color: firebrick">[content removed]</span>' : this.checkLinks(cleanString)
    }
  }
}).mount('#app')