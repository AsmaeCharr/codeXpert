import React from 'react'
import '../styles/normalize.css'
import PropTypes from 'prop-types'

Ranking.propTypes = {
  rankingData: PropTypes.array
}

function Ranking({ rankingData }) {
  return (
    <div style={{ color: 'white' }}>
      <h1>RANKING</h1>
      <div>

      </div>
      <table>
        <thead>
          <tr>
            <th>Pos</th>
            <th>Username</th>
            <th>ELO</th>
            <th>LVL</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(rankingData) && rankingData.map((element, index) => {
            return (
              <tr key={index}>
                <td>
                  {index === 0 &&
                    <img src={require('../img/Trofeo.png')}
                      height='50px'
                      className='user__position'
                      alt='Winner' />}</td>
                <td>
                  <img
                    src={element.avatar}
                    width='50px'
                    className='user__image'
                    alt={element.name + '\'s avatar'}
                  ></img>
                  {element.name}
                </td>
                <td>
                  {element.elo}
                </td>
                <td>
                  {element.xp}
                </td>
              </tr>
            )
          })
          }
        </tbody>
      </table>
    </div>
  )
}

export default Ranking
