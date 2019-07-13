import React from 'react';
import io from "socket.io-client";

let socket;

let canvasPos;

let draw;

let thisPlayer

let gameInterval;

let players;

let thisId;

let unclaimedDisks = [];

let pucks = [];

let boundary = {
    top: 50,
    left: 50,
    bottom: 625,
    right: 1150
  }



function Player(name,color){
    this.name = name;

    this.color = color;

    this.mouse = {x: 0, y: 0}

    this.hasDisk = 0
}

function Disk(x,y){
    this.x = x

    this.y = y

    this.maxSpeed = 20;

    this.radius = 20;

    this.direction = 0;

    this.speed = 0;
    this.xSpeed = 0;
    this.ySpeed = 0;
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

function movePuck(puck){

    for(let i = 0; i < 2; i++){

        //moving the puck
        puck.x += puck.xSpeed
    
        puck.y += puck.ySpeed

        
        
        //bouncing off the walls
        if(puck.x -puck.radius< boundary.left){
            puck.x += (boundary.left - (puck.x - puck.radius))*2
        
            puck.xSpeed = -puck.xSpeed
        }
        if(puck.x +puck.radius> boundary.right){
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
                puck.x -= puck.xSpeed /10
                puck.y -= puck.ySpeed /10

                disk.x -= disk.xSpeed /10
                disk.y -= disk.ySpeed /10
            }
            

            let collisionAngle = direction(disk.x,disk.y,puck.x,puck.y)

            let angleDiff = Math.abs(collisionAngle - disk.direction)

            while(angleDiff > Math.PI){
                angleDiff = Math.abs(angleDiff - 2*Math.PI)
            }

            puck.speed = (disk.speed * (((Math.PI/2) - angleDiff)/(Math.PI/2)))*1.1

            console.log("disk speed:" + disk.speed)

            console.log("puck speed:" + puck.speed)

            puck.direction = collisionAngle
        }

        puck.speed -= puck.friction

        if(puck.speed < 0){
            puck.speed = 0
        }

        if(puck.speed > puck.maxSpeed)
            puck.speed = puck.maxSpeed

        let newSpeeds = findXY(puck.speed,puck.direction)

        puck.xSpeed = newSpeeds.x
        puck.ySpeed = newSpeeds.y

        
        
    }
    return puck
  }

//hello
thisPlayer = new Player("Ashlyn","#ff0000")


class GameScreen extends React.Component {  

    //sets up game once the canvas mounts on screen

    componentDidMount() {
        const canvas = this.refs.canvas
        draw = canvas.getContext("2d")

        draw.translate(.5,.5);

        

        gameInterval = setInterval(() =>{
            this.gameStep()
        },(1000/60))

        //activating sockets

        socket = this.props.userSocket

        players = []

        socket.emit("player join", thisPlayer)

        socket.on("player join response", function(data){
            players = data.players

            thisId = data.id

            unclaimedDisks = data.disks
        })

        socket.on("other join response", function(data){
            players = data.players

            unclaimedDisks = data.disks
        })

        socket.on("player info response", function(player){
            players[player.id] = player;
        })

        socket.on("claim disk response", function(data){
            unclaimedDisks = data.disks

            pucks = data.pucks

            console.log(pucks)
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

                players[thisId].disk.direction = direction(player.disk.x,player.disk.y,player.mouse.x,player.mouse.y)

                if(distance(player.mouse.x,player.mouse.y,player.disk.x,player.disk.y) <= player.disk.maxSpeed){

                    players[thisId].disk.xSpeed = player.mouse.x - players[thisId].disk.x
                    players[thisId].disk.ySpeed = player.mouse.y - players[thisId].disk.y

                    players[thisId].disk.speed = distance(0,0,players[thisId].disk.ySpeed,players[thisId].disk.xSpeed)

                    players[thisId].disk.x = player.mouse.x
                    players[thisId].disk.y = player.mouse.y



                   
                }
                else{
                    const moveDist = findXY(player.disk.maxSpeed,players[thisId].disk.direction)

                    players[thisId].disk.x += moveDist.x
                    players[thisId].disk.y += moveDist.y

                    players[thisId].disk.xSpeed = moveDist.x
                    players[thisId].disk.ySpeed = moveDist.y

                    players[thisId].disk.speed = player.disk.maxSpeed
                }

            }

            pucks.forEach(function(puck){
                movePuck(puck)
            })

            socket.emit("player info", players[thisId])

        }

        

        this.renderFrame()
    }

    renderFrame = function(){

        
    
        this.clearCanvas();
    
        

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
            draw.beginPath();

            draw.arc(current.x,current.y,current.radius,0,2*Math.PI)
            
            draw.fillStyle = "#ffffff"
    
            draw.fill();
        })

        //render unclaimed disks

        for(let i = 0; i < unclaimedDisks.length; i++){

            const current = unclaimedDisks[i]

            draw.beginPath();

            draw.arc(current.x,current.y,current.radius,0,2*Math.PI)
            
            draw.strokeStyle = "#ffffff"
    
            draw.stroke();
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
                    players[thisId].disk = new Disk(current.x,current.y)

                    players[thisId].hasDisk = 1;

                    unclaimedDisks.splice(unclaimedDisks.indexOf(current),1)

                    socket.emit("claim disk", unclaimedDisks)

                    socket.emit("player info", players[thisId])
                }
            })
        }
    }

    getCanvasPos = function(){
        canvasPos = this.refs.canvas
    }

    render() {
        return(
            <canvas onMouseMove = {this.onMouseMove} onClick = {this.onClick} id ="canvas-a" ref="canvas" width="1200px" height="675px"/>
        )
    }
}
export {GameScreen}

