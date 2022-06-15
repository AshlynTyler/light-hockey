import React from 'react';
import io from "socket.io-client";
import './App.css';
import { isThisMonth } from 'date-fns';

let socket;

let canvasPos;

let draw;

let thisPlayer

let listeners = ["player join response"
,"other join response"
,"player info response"
,"claim disk response"
,"puck info response"
,"goal response"]

let gameInterval;

let players;

let thisId;

let unclaimedDisks = [];

let puckTimers = [];

let pucks = [];

let thisCanvas;

let boundary = {
    top: 10,
    left: 10,
    bottom: 665,
    right: 1190
}



function Player(name,color){
    this.name = name;

    this.color = color;

    this.mouse = {x: 0, y: 0}

    this.hasDisk = 0
}

function Disk(x,y,team){
    this.x = x

    this.y = y

    this.maxSpeed = 20;

    this.radius = 25;

    this.direction = 0;

    this.speed = 0;
    this.xSpeed = 0;
    this.ySpeed = 0;

    this.xSpeedArray = []
    this.ySpeedArray = []

    this.team = team
}

function PuckTimer(puck,y = 675/2, x = 600){
    this.x = x
    this.y = y

    this.time = 3000

    this.puck = puck
}



//returns the distance between two points.
function distance(x1,y1,x2,y2){
    return Math.sqrt(((x1-x2)**2)+((y1-y2)**2))
}

//returns the angle of direction in radians from the first point to the second point
// relative to the positive x axis (going counterclockwise).

function direction(x1,y1,x2,y2){

    return Math.atan2(y1-y2,x2-x1)
}

//returns the x and y length of a right triangle with hypotenuse of "length"
// and an angle of "angle".

function findXY(length,angle){
    return{
        y: Math.sin(angle) * length * -1,
        x: Math.cos(angle) * length
    }
}

function scoreGoal(puck,team){
    if(puck.y > boundary.top + (boundary.bottom-boundary.top)/3 && puck.y < boundary.top + (boundary.bottom-boundary.top)*2/3){
        puck.goal = 1

        socket.emit("goal",{team:team, puck:puck})
    }
  
  }

function movePuck(puck){

    for(let i = 0; i < 2; i++){

        //moving the puck
        puck.x += puck.xSpeed
    
        puck.y += puck.ySpeed

        
        
        //bouncing off the walls
        if(puck.x -puck.radius< boundary.left){

            scoreGoal(puck,"red");

            puck.x += (boundary.left - (puck.x - puck.radius))*2

            puck.xSpeed = -puck.xSpeed
        }
        if(puck.x +puck.radius> boundary.right){

            scoreGoal(puck,"blue");
            puck.x += (boundary.right - (puck.x + puck.radius))*2
        
            puck.xSpeed = -puck.xSpeed
        }
        if(puck.y -puck.radius< boundary.top){
            puck.y += (boundary.top - (puck.y - puck.radius))*2
        
            puck.ySpeed = -puck.ySpeed
        }
        if(puck.y +puck.radius> boundary.bottom){
            puck.y += (boundary.bottom - (puck.y + puck.radius))*2
        
            puck.ySpeed = -puck.ySpeed
        }

        

        puck.speed = distance(0,0,puck.xSpeed,puck.ySpeed)

        puck.direction = direction(0,0,puck.xSpeed,puck.ySpeed)

        puck.speed -= puck.friction

        if(puck.speed < 0){
            puck.speed = 0
        }

        if(puck.speed > puck.maxSpeed)
            puck.speed = puck.maxSpeed

        let newSpeeds = findXY(puck.speed,puck.direction)

        puck.xSpeed = newSpeeds.x
        puck.ySpeed = newSpeeds.y

        if(players[thisId].hasDisk === 1){
            let disk = players[thisId].disk

            if(i === 0){
                disk.x -= disk.xSpeed/2
                disk.y -= disk.ySpeed/2
            }
            else{
                disk.x += disk.xSpeed/2
                disk.y += disk.ySpeed/2
            }
        

            //checking for collision with a player disk
            if(distance(puck.x,puck.y,disk.x,disk.y) < puck.radius + disk.radius && (disk.speed !== 0 || puck.speed !== 0)){
                while(distance(puck.x,puck.y,disk.x,disk.y) < puck.radius + disk.radius){

                    let loopBreak = 50;
                    puck.x -= puck.xSpeed /10
                    puck.y -= puck.ySpeed /10

                    disk.x -= disk.xSpeed /10
                    disk.y -= disk.ySpeed /10

                    loopBreak--

                    if(loopBreak === 0)
                        break
                }
                

                let collisionAngle = direction(disk.x,disk.y,puck.x,puck.y)

                let angleDiff = Math.abs(collisionAngle - disk.direction)

                while(angleDiff > Math.PI){
                    let loopBreak = 20;
                    angleDiff = Math.abs(angleDiff - 2*Math.PI)

                    loopBreak--

                    if(loopBreak === 0)
                        break
                }

                let newSpeed1 = (disk.speed * (((Math.PI/2) - angleDiff)/(Math.PI/2)))*1.1

                let newDirection1 = collisionAngle

                let newXY1 = findXY(newSpeed1,newDirection1)

                

                angleDiff = collisionAngle - puck.direction


                let newDirection2 = puck.direction +angleDiff

                let newSpeed2 = puck.speed * .4

                let newXY2 = findXY(newSpeed2,newDirection2)




                puck.xSpeed = newXY1.x + newXY2.x
                puck.ySpeed = newXY1.y + newXY2.y

                puck.goal = 0

                socket.emit("puck info", puck)
            }

        }
        
        
    }
    return puck
  }

//hello
thisPlayer = new Player("Ashlyn","#ff0000")


class GameScreen extends React.Component {  

    state = {
        score:{
            red: 0,
            blue: 0
        },
        playerNames: ["","","",""],
        playerColors: ["#000000","#000000","#000000","#000000"],
        winner: "none"
    }

    //sets up game once the canvas mounts on screen

    componentDidMount() {

        unclaimedDisks = [];

        puckTimers = [];

        pucks = [];

        const canvas = this.refs.canvas
        draw = canvas.getContext("2d")

        draw.translate(.5,.5);

        thisCanvas = this

        

        gameInterval = setInterval(() =>{
            this.gameStep()
        },(1000/60))

        //activating sockets

        socket = this.props.userSocket

        players = []

        thisPlayer.name = this.props.userName

        thisPlayer.color = this.props.userColor

        socket.emit("player join", thisPlayer)

        socket.on("player join response", (data) =>{
            players = data.players

            thisId = data.id

            unclaimedDisks = data.disks

            this.setState({score: data.score})

            
        })

        socket.on("other join response", function(data){
            players = data.players

            unclaimedDisks = data.disks

            
        })

        socket.on("player info response", function(player){
            players[player.id] = player;
        })

        socket.on("claim disk response", (data) =>{
            unclaimedDisks = data.disks

            let state = this.state

            state.playerNames[data.player.diskId] = data.player.name

            state.playerColors[data.player.diskId] = data.player.color

            this.setState({playerNames: state.playerNames, playerColors: state.playerColors})

            if(data.newpuck)
                puckTimers.push(new PuckTimer(data.pucks[data.pucks.length -1]))

        })

        socket.on("puck info response", function(puck){
            pucks[puck.id] = puck

            
        })

        socket.on("goal response",(data) =>{
            pucks.splice(data.id,1)

            pucks.forEach(function(index){
                index.id = pucks.indexOf(index)
            })

            this.setState({score: data.score})

            if(data.score.blue === 10){
                this.setState({winner: "blue"})
            }
            else if(data.score.red === 10){
                this.setState({winner: "red"})
            }
            else
                puckTimers.push(new PuckTimer(data.puck))
        })
    }

    //clears the entire canvas
    clearCanvas = function(){
        draw.clearRect(
            0,
            0,
            this.refs.canvas.offsetWidth,
            this.refs.canvas.offsetHeight
        )
    }

    gameStep = function(){

        if (typeof(thisId) != "undefined"){

            let player = players[thisId]

            //moves your disk towards you.

            if(player.hasDisk === 1){

                const disk  = players[thisId].disk

                let prevX = disk.x
                let prevY = disk.y

                let avg = 0

                if(distance(player.mouse.x,player.mouse.y,player.disk.x,player.disk.y) <= player.disk.maxSpeed){

                    disk.x = player.mouse.x
                    disk.y = player.mouse.y
                   
                }
                else{
                    const moveDist = findXY(player.disk.maxSpeed,direction(disk.x,disk.y,player.mouse.x,player.mouse.y))

                    disk.x += moveDist.x
                    disk.y += moveDist.y
                }

                //pushing disk off of boundries

                let divider = this.refs.canvas.offsetWidth/2

                if(disk.x + disk.radius > divider  && disk.team === "blue"){
                    disk.x = divider - disk.radius
                }

                if(disk.x - disk.radius < divider  && disk.team === "red"){
                    disk.x = divider + disk.radius
                }

                if(disk.y - disk.radius < boundary.top){
                    disk.y = boundary.top + disk.radius
                }

                if(disk.x - disk.radius < boundary.left){
                    disk.x = boundary.left + disk.radius
                }

                if(disk.y + disk.radius > boundary.bottom){
                    disk.y = boundary.bottom - disk.radius
                }

                if(disk.x + disk.radius > boundary.right){
                    disk.x = boundary.right - disk.radius
                }

                puckTimers.forEach(function(timer){
                    if(distance(disk.x,disk.y,timer.x,timer.y) < 100 + disk.radius){

                        let newXY = findXY(100 +disk.radius,direction(timer.x,timer.y,disk.x,disk.y))

                        disk.x =  timer.x + newXY.x

                        disk.y = timer.y + newXY.y
                    }
                })

                //getting x and y speed by averaging out the 3 previous speeds

                disk.xSpeedArray.push(disk.x - prevX)
                disk.ySpeedArray.push(disk.y - prevY)

                if(disk.xSpeedArray.length > 3)
                    disk.xSpeedArray.shift()

                if(disk.ySpeedArray.length > 3)
                    disk.ySpeedArray.shift()

                disk.xSpeedArray.forEach(function(index){
                    avg += index
                })

                disk.xSpeed = avg / disk.xSpeedArray.length

                avg = 0

                disk.ySpeedArray.forEach(function(index){
                    avg += index
                })

                disk.ySpeed = avg / disk.ySpeedArray.length

                disk.speed = distance(0,0,disk.xSpeed,disk.ySpeed)

                disk.direction = direction(0,0,disk.xSpeed,disk.ySpeed)

            }

            pucks.forEach(function(puck){
                if(puck.goal === 0)
                    movePuck(puck)

                
            })

            socket.emit("player info", players[thisId])

            puckTimers.forEach(function(timer){
                timer.time -= 1000/50

                if(timer.time < 1){
                    pucks.push(timer.puck)

                    puckTimers.splice(puckTimers.indexOf(timer),1)
                }
            })

        }

        

        this.renderFrame()
    }

    renderFrame = function(){

        
    
        this.clearCanvas();

        //drawing the board

        let width = this.refs.canvas.offsetWidth

        let height = this.refs.canvas.offsetHeight

        draw.lineWidth = 2

        draw.beginPath();

        draw.strokeStyle = "#ffffff55"

        draw.moveTo(width/2,boundary.top)

        draw.lineTo(width/2,boundary.bottom)

        draw.stroke();

        draw.beginPath();

        draw.strokeStyle = "#0000ff"
    
        draw.moveTo(width/2,boundary.top)

        draw.lineTo(boundary.left,boundary.top)

        draw.lineTo(boundary.left,boundary.bottom)

        draw.lineTo(width/2,boundary.bottom)

        draw.stroke();

        draw.beginPath();

        draw.strokeStyle = "#ff0000"
    
        draw.moveTo(width/2,boundary.top)

        draw.lineTo(boundary.right,boundary.top)

        draw.lineTo(boundary.right,boundary.bottom)

        draw.lineTo(width/2,boundary.bottom)

        draw.stroke();

        draw.beginPath();

        draw.strokeStyle = "#ffffff"

        draw.lineWidth = 4

        draw.moveTo(boundary.left,boundary.top + (boundary.bottom-boundary.top)/3)

        draw.lineTo(boundary.left,boundary.top + (boundary.bottom-boundary.top)*2/3)

        draw.moveTo(boundary.right,boundary.top + (boundary.bottom-boundary.top)/3)

        draw.lineTo(boundary.right,boundary.top + (boundary.bottom-boundary.top)*2/3)

        draw.stroke()

        draw.lineWidth = 3

        for(let i = 0; i < players.length; i++){



            //render disks of players

            if(players[i].hasDisk === 1){

                draw.beginPath();

                draw.arc(players[i].disk.x,players[i].disk.y,players[i].disk.radius,0,2*Math.PI)
                
                draw.strokeStyle = players[i].color
        
                draw.stroke();
            }

            //render mouse pointer of players

            draw.beginPath();

            draw.arc(players[i].mouse.x,players[i].mouse.y,5,0,2*Math.PI)
            
            draw.fillStyle = players[i].color

            draw.fill();


        }

        //render pucks

        pucks.forEach(function(current){
            if(current.goal === 0){

                draw.beginPath();

                draw.arc(current.x,current.y,current.radius,0,2*Math.PI)
                
                draw.fillStyle = "#ffffff"
        
                draw.fill();
            }
        })

        //render unclaimed disks

        for(let i = 0; i < unclaimedDisks.length; i++){

            const current = unclaimedDisks[i]

            draw.beginPath();

            draw.arc(current.x,current.y,current.radius,0,2*Math.PI)
            
            draw.strokeStyle = "#ffffff"
    
            draw.stroke();
        }

        //render puck timer

        draw.textAlign = "center"

        draw.textBaseline = "middle"

        draw.font = '100px digitalfont'

        draw.fillStyle = "#ffffff"

        draw.lineWidth = 10

        draw.strokeStyle = "#ffffffbb"

        puckTimers.forEach((timer) => {
            draw.fillText((Math.ceil(timer.time/1000)),width/2,height/2+10)

            draw.beginPath()
            draw.arc(width/2,height/2,100,(1.5 - timer.time/1500)*Math.PI,1.5*Math.PI)

            draw.stroke()
        })

        //render win message

        if(this.state.winner === "red"){
            
            draw.font = '60px digitalfont'

            draw.fillStyle = "#ff0000"

            draw.textAlign = "center"

            draw.fillText("Red Team Wins!", width/2,height/2)

            draw.font = '30px digitalfont'

            draw.fillStyle = "#ffffff"

            draw.fillText("Click anywhere to return to the lobby.", width/2,height/2 + 60)
        }

        if(this.state.winner === "blue"){
            
            draw.font = '60px digitalfont'

            draw.fillStyle = "#0000ff"

            draw.textAlign = "center"

            draw.fillText("Blue Team Wins!", width/2,height/2)

            draw.font = '30px digitalfont'

            draw.fillStyle = "#ffffff"

            draw.fillText("Click anywhere to return to the lobby.", width/2,height/2 + 60)
        }

    }

    onMouseMove = (event) =>{
        this.getCanvasPos()

        if (typeof(thisId) != "undefined"){
            players[thisId].mouse.x = event.pageX - canvasPos.offsetLeft
            players[thisId].mouse.y = event.pageY - canvasPos.offsetTop

            
        }
    }

    onClick = (event) =>{
        this.getCanvasPos()

        if(players[thisId].hasDisk === 0){

            unclaimedDisks.forEach(function(current){

                if(distance(players[thisId].mouse.x,players[thisId].mouse.y,current.x,current.y) <= current.radius){
                    players[thisId].disk = new Disk(current.x,current.y,current.team)

                    players[thisId].hasDisk = 1;

                    players[thisId].diskId = current.id

                    unclaimedDisks.splice(unclaimedDisks.indexOf(current),1)

                    socket.emit("claim disk", {disks: unclaimedDisks, player: players[thisId]})

                    socket.emit("player info", players[thisId])
                }
            })
        }

        if(this.state.winner !== "none"){

            clearInterval(gameInterval)
            socket.emit("end game", players[thisId])
            listeners.forEach(function(listener){
                socket.off(listener)
            })
        }
    }

    getCanvasPos = function(){
        canvasPos = this.refs.canvas
    }

    render() {
        return(
            <>
                <div>
                    <span className="score" id="blue-score">{this.state.score.blue}</span>
                    <span className="score">  -  </span>
                    <span className="score" id="red-score">{this.state.score.red}</span>
                </div>
                <div id = "nameContainer">
                    <p id = "player1" className = "playerName" style={{color: this.state.playerColors[0]}}>{this.state.playerNames[0]}</p>
                    <p id = "player2" className = "playerName" style={{color: this.state.playerColors[1]}}>{this.state.playerNames[1]}</p>
                    <p id = "player3" className = "playerName" style={{color: this.state.playerColors[2]}}>{this.state.playerNames[2]}</p>
                    <p id = "player4" className = "playerName" style={{color: this.state.playerColors[3]}}>{this.state.playerNames[3]}</p>
                </div>
                <canvas onMouseMove = {this.onMouseMove} onTouchStart = {this.onMouseMove} onTouchMove = {this.onMouseMove} 
                    onClick = {this.onClick} 
                    id ="canvas-a" 
                    ref="canvas" 
                    width="1200px" 
                    height="675px"
                />
            </>
        )
    }
}
export {GameScreen}

