import '../styles/normalize.css'
import React, { useState, useEffect } from 'react'

function ChatLobby() {
  const [messages, setMessages] = useState([])
  const [msg, setMsg] = useState('')

  const handleMessage = (event) => {
    const eventData = event.data

    switch (eventData.type) {
      case 'lobby_message-event':
        setMessages(window.network.getLobbyMessages())
        break

      default:
        break
    }
  }

  function showChat() {
    document.getElementById('chat__body').style.display = 'block'
    document.getElementById('chat__body').style.transition = 'all 2s ease-in'
  }

  function NoFocus() {
    document.getElementById('chat__body').style.display = 'none'
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (msg !== '') {
      window.postMessage({
        type: 'chat_message-emit',
        message: msg
      }, '*')
      setMsg('')
    }
  }

  useEffect(() => {
    document.getElementById('chat__body').scrollTop = document.getElementById('chat__body').scrollHeight

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  })

  return (
    <div className='lobby__chat chat'>
      <div className='chat__body' id='chat__body'>
        <ul id='messages' className='lobby__chatUl chat' >
          {Array.isArray(messages)
            ? messages.map((element, index) => {
              if (element.nickname !== 'ingame_events') {
                return (
                  <li className='chat__message' key={index}>
                    <img
                      src={element.avatar}
                      width='50px'
                      className='user__image'
                      alt={element.nickname + '\'s avatar'}
                    ></img>{element.nickname + ': ' + element.message}
                  </li>
                )
              } else {
                return (
                  <li className='chat__message chat__message--event' key={index}>
                    <strong>{element.message}</strong>
                  </li>
                )
              }
            })
            : null}
        </ul>
      </div>
      <form id='form' onSubmit={handleSendMessage}>
        <div className='form--grid'>
          <div className='inputMsg-div'>
            <input
              onFocus={showChat}
              onBlur={NoFocus}
              id='input_message'
              autoComplete='off'
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
          </div>

          <div className='buttonMsg-div'>
            <button className='send__button'>Send</button>
          </div>
        </div>
      </form>
    </div>

  )
}

export default ChatLobby
