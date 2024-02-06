import { createApp } from 'vue';

createApp({
  data() {
    return {
      messages: {
        '858': []
      },
      members: {
        '858': []
      },
      currentChannel: 858,
      author: 'cty'
    }
  },
  mounted() {
    document.querySelector('#author').value = this.author
    setInterval(() => {
      Object.keys(this.messages).forEach(channel => this.fetchMessages(channel))
    }, 1000);
  },
  methods: {
    fetchMessages(channel) {
      const url = `https://wagon-chat.herokuapp.com/${channel}/messages`;
      fetch(url)
        .then(response => response.json())
        .then(data=> {
          const messages = data.messages;
          const previousChannelMsgs = this.messages[data.channel]
          if (previousChannelMsgs && previousChannelMsgs.length > 0) {
            const newMessages = messages.filter(msg=> msg.id > previousChannelMsgs[previousChannelMsgs.length - 1].id)
            this.messages[data.channel] = [...previousChannelMsgs, ...newMessages]
          } else {
            this.messages[data.channel] = messages;
          }
          this.members[data.channel] = this.getMembers(this.messages[data.channel])
        });
    },
    sendMessage(e) {
      const url = `https://wagon-chat.herokuapp.com/${this.currentChannel}/messages`;
      const input = e.target
      if (e.key == 'Enter' && this.author) {
        fetch(url, {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({author: this.author, content: input.value})
        }).then(response=>response.json()).then(data=>{
          input.value = ''
        })
      }
    },
    setAuthor(e) {
      const input = e.target;
      input.value.length > 0 ? this.author = input.value : input.value = this.author;
    },
    setChannel(e) { this.currentChannel = e.target.id },
    isAuthor(message) { return message.author == this.author},
    getMembers(messages) {
      const members = messages.map((msg) => {return msg.author})
      return [...new Set(members)]
    },
    showMemberCount() { return `Users (${this.members[this.currentChannel].length})` },
    createNewChannel(e) {
      const channel = prompt("Please enter the batch number", "000");
      if (channel !== null && channel !== "") { this.messages[channel] = [] }
    }
  }
}).mount('#app')
