import '../styles/normalize.css'
import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

Timer.propTypes = {
  time: PropTypes.int
}

function Timer({ time }) {
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    if (time > 0) {
      console.log('Empieza timer')
      const timer = setInterval(() => {
        setCounter(counter + 1)

        if (counter >= time) {
          clearInterval(timer)
        }
      }, 1000)
    }
  }, [time])

  return (
    <div>
      {time > 0 ? <h1>{counter}</h1> : <></>}
    </div>
  )
}

export default Timer
