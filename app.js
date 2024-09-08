// VIDEO AND API VARIABLES TO STORE POSE DATA
let video;
let poseNet;
let poses = [];

// MAIN JAVASCRIPT CANVAS AND ATTACHED CONTEXT
var canvas;
var ctx;

// AVATAR OPTIONS
var threshold = 0.2;
var head_height_ratio = 2;
var head_width_to_height = 0.8;
var head_image_ratio = 2;
var limb_width_ratio = 4;
var limb_length_ratio = 1.25;
var hip_height_ratio = 0.5;
var hip_width_ratio = 1.2;
var neck_width_ratio = 0.35;
var smoothness = [1, 8];

// POINT FOR 'POINT TAPPING' GAME
var test_point =[];
var test_point_radius = 30;
var test_point_pos = {x: 0, y: 0};

// POINTS FOR 'DODGE POINT' GAME
var dodge_points = [];
var dodge_points_pos = [];
var dodge_points_radius = [];
var dodge_points_radius_start = 0;
var dodge_points_radius_hit = 60;
var dodge_points_radius_max = 80;
var dodge_points_radius_speed = 0.5;
var dodge_points_cur = [];
var dodge_points_speed = 5;
var dodge_points_time = 100;
var dodge_points_num = 4;

// CURRENT SET GAME MODE
var gamemode = 0;

// HIDDEN OPTIONS FOR 'HOLE IN THE WALL' GAME
var time_period = 200;
var result_period = 70;
var t = 0;
var hole_flag = false;

// AVATAR HITBOX DATA
var hitbox_body = [];

// HITBOX OPTION
var show_hitboxes = false;

// APPLIES NEWLY INPUTTED OPTIONS FROM GAME PAGE
function applyOptions(){
	threshold = document.getElementById("threshold").value;
	head_height_ratio = document.getElementById("head_height_ratio").value;
	head_width_to_height = document.getElementById("head_width_to_height").value;
	head_image_ratio = document.getElementById("head_image_ratio").value;
	limb_width_ratio = document.getElementById("limb_width_ratio").value;
	limb_length_ratio = document.getElementById("limb_length_ratio").value;
	hip_height_ratio = document.getElementById("hip_height_ratio").value;
	smoothness = [1, parseInt(document.getElementById("smoothness").value)];
	show_hitboxes = document.getElementById("show-hitboxes").checked;
}

// READS THE URL OF AN INPUTTED IMAGE
function readURL(input, id) {
	var url = input.value;
  var reader = new FileReader();

  reader.onload = function (e) {
    $('#'+id).attr('src', e.target.result);
  }
  reader.readAsDataURL(input.files[0]);
}

// CHOOSING THE SELECTED GAMEMODE
function choose(id){
  if(id==1){
    document.getElementById("dropdown-show").innerHTML = "Point Tapping";
    gamemode = 1;
  }else if(id==2){
    document.getElementById("dropdown-show").innerHTML = "Hole in the Wall";
    gamemode = 2;
  }else if(id==3){
    document.getElementById("dropdown-show").innerHTML = "Dodge Point";
    gamemode = 3;
  }
}

// RESETS THE POINT IN THE 'POINT TAPPING' GAME
function resetTestPoint() {
  test_point = [];
  // GENERATES RANDOM COORDINATES FOR THE POINT
  test_point_pos = {x: getRandom(50, 950), y: getRandom(50, 650)};
  // WILL RE-GENERATE IF THAT POINT IS ALREADY IN CONTACT WITH THE USER
  while(isPointInPoly(hitbox_body, test_point_pos))
    test_point_pos = {x: getRandom(50, 950), y: getRandom(50, 650)};
  // CREATES A CIRCLE AROUND THE GENERATED POINT
  for(var i = 0; i<=360; i++){
    test_point.push({
      x: test_point_pos.x+Math.cos(i/180*Math.PI)*test_point_radius,
      y: test_point_pos.y+Math.sin(i/180*Math.PI)*test_point_radius
    })
  }
}
// SINCE THE STARTING VARIABLES ARE EMPTY, THE NEED TO BE RESET IN THE BEGINNING
resetTestPoint();

// 'DODGE POINT' POINTS ALSO NEED TO BE PROPOGATED
for(var i = 0; i<dodge_points_num; i++){
  // GENERATES A RANDOM POINT FOR EACH POINT
  var cur_dodge_points_pos = {x: getRandom(50, 950), y: getRandom(50, 650)};
  // WILL RE-GENERATE IF THAT POINT IS ALREADY IN CONTACT WITH THE USER
  while(isPointInPoly(hitbox_body, cur_dodge_points_pos))
    cur_dodge_points_pos = {x: getRandom(50, 950), y: getRandom(50, 650)};
  dodge_points_pos.push(cur_dodge_points_pos);
  dodge_points.push([]);
  dodge_points_radius.push(dodge_points_radius_start);
  // CREATES A CIRCLE AROUND THE GENERATED POINT
  for(var j = 0; j<=360; j++){
    dodge_points[i].push({
      x: dodge_points_pos[i].x+Math.cos(j/180*Math.PI)*dodge_points_radius[i],
      y: dodge_points_pos[i].y+Math.sin(j/180*Math.PI)*dodge_points_radius[i]
    })
  }
}

// RESETS A SPECIFIC DODGE POINT
function resetDodgePoint(i){
  dodge_points[i] = [];
  dodge_points_radius[i] = dodge_points_radius_start;
  // RE-GENERATES POINT
  var cur_dodge_points_pos = {x: getRandom(50, 950), y: getRandom(50, 650)};
  while(isPointInPoly(hitbox_body, cur_dodge_points_pos))
    cur_dodge_points_pos = {x: getRandom(50, 950), y: getRandom(50, 650)};
  dodge_points_pos[i] = cur_dodge_points_pos;
  // RE-CREATES CIRCLE
  for(var j = 0; j<=360; j++){
    dodge_points[i].push({
      x: dodge_points_pos[i].x+Math.cos(j/180*Math.PI)*dodge_points_radius[i],
      y: dodge_points_pos[i].y+Math.sin(j/180*Math.PI)*dodge_points_radius[i]
    })
  }
}

// UPDATES EVERY DODGE POINT TO TEST FOR CONTACT AND INCREASE RADIUS
function updateDodgePoint(){
  for(var i = 0; i<dodge_points_num; i++){
    dodge_points[i] = [];
    // INCREASE THAT DODGE POINT'S RADIUS BY THE RADIUS SPEED
    dodge_points_radius[i]+=dodge_points_radius_speed;
    // IF THE MAX RADIUS IS REACHED, THE POINT IS RESET
    if(dodge_points_radius[i]>=dodge_points_radius_max){
      resetDodgePoint(i);
    }
    // NEW RADIUS IS APPLIED
    for(var j = 0; j<=360; j++){
      dodge_points[i].push({
        x: dodge_points_pos[i].x+Math.cos(j/180*Math.PI)*dodge_points_radius[i],
        y: dodge_points_pos[i].y+Math.sin(j/180*Math.PI)*dodge_points_radius[i]
      })
    }
  }
}

// STORED CACHE OF PREVIOUSLY DETECTED POSES COORDINATES
// NEEDED FOR SMOOTHING IMPLEMENTATION
var cache = {
  chest: {x:0, y:0, w:0, h:0, rot:0, imageName:"chest"},
  head: {x:0, y:0, w:0, h:0, rot:0, imageName:"head"},
  hip: {x:0, y:0, w:0, h:0, rot:0, imageName:"hip"},
  leftArm: {x:0, y:0, w:0, h:0, rot:0, imageName:"leftArm"},
  leftFoot: {x:0, y:0, w:0, h:0, rot:0, imageName:"leftFoot"},
  leftShoulder: {x:0, y:0, w:0, h:0, rot:0, imageName:"leftShoulder"},
  leftThigh: {x:0, y:0, w:0, h:0, rot:0, imageName:"leftThigh"},
  neck: {x:0, y:0, w:0, h:0, rot:0, imageName:"neck"},
  rightArm: {x:0, y:0, w:0, h:0, rot:0, imageName:"rightArm"},
  rightFoot: {x:0, y:0, w:0, h:0, rot:0, imageName:"rightFoot"},
  rightShoulder: {x:0, y:0, w:0, h:0, rot:0, imageName:"rightShoulder"},
  rightThigh: {x:0, y:0, w:0, h:0, rot:0, imageName:"rightThigh"}
}

// p5.js PREDEFINED FUNCTION THAT IS CALLED WHEN THE PAGE IS LOADED
function setup() {
  // CREATES A VIDEO CANVAS ATTACHED TO THE WEBCAM
  createCanvas(1000, 700);
  frameRate(60);
  video = createCapture(VIDEO);
  video.size(width, height);

  // HIDES THE WEBCAM VIDEO
  canvas = document.getElementById("feed");
  document.getElementById("defaultCanvas0").style.display = "none";
  canvas.width = width;
  canvas.height = height;
  ctx = canvas.getContext('2d');
  
  // CREATES A NEW PoseNet METHOD WITH SINGLE DETECTION (ONLY DETECTS ONE INDIVIDUAL)
  // FLIPS THE DETECTED COORDINATES HORIZONTALLY
  // ASSIGNS DETECTED COORDINATES TO 'poseNet' VARIABLE
  poseNet = ml5.poseNet(video, {flipHorizontal: true}, modelReady);

  // FILLS VARIABLE 'poses' WITH DETECTED COORDINATES EVERY TIME A NEW POSE IS DETECTED
  poseNet.on('pose', function(results) {
    poses = results;
  });

  // HIDE THE VIDEO ELEMENT, AND JUST SHOW CANVAS
  video.hide();
}

// DEFINING THE 'HOLE IN THE WALL' SHAPES TO FIT THROUGH IN THE GAME
var hole_in_the_wall = [
[ 
{x:0, y: 700}, 
{x:380, y:700}, {x:378, y:461}, {x:385, y:265}, {x:205, y:256}, {x:143, y:193}, {x:153, y:114}, {x:234, y:96}, {x:356, y:94}, {x:406, y:86}, {x:383, y:37}, {x:421, y:10}, {x:612, y:16}, {x:658, y:69}, {x:614, y:102}, {x:847, y:101}, {x:889, y:151}, {x:885, y:216}, {x:774, y:247}, {x:627, y:232}, {x:653, y:395}, {x:634, y:700},
{x:1000, y: 700}, 
{x:1000, y: 0}, 
{x:0, y: 0}, 
],
[ 
{x:0, y: 700}, 
{x:342, y:700}, {x:324, y:495}, {x:318, y:322}, {x:327, y:173}, {x:409, y:72}, {x:492, y:22}, {x:613, y:27}, {x:686, y:94}, {x:676, y:226}, {x:626, y:330}, {x:612, y:445}, {x:589, y:547}, {x:574, y:700},
{x:1000, y: 700}, 
{x:1000, y: 0}, 
{x:0, y: 0}, 
],
[ 
{x:0, y: 700}, 
{x:387, y:700}, {x:386, y:537}, {x:387, y:427}, {x:360, y:324}, {x:326, y:239}, {x:324, y:162}, {x:267, y:116}, {x:288, y:72}, {x:355, y:16}, {x:463, y:20}, {x:551, y:69}, {x:621, y:193}, {x:682, y:317}, {x:696, y:465}, {x:697, y:700},
{x:1000, y: 700}, 
{x:1000, y: 0}, 
{x:0, y: 0}, 
],
[ 
{x:0, y: 700}, 
{x:344, y:700}, {x:280, y:509}, {x:317, y:425}, {x:418, y:377}, {x:409, y:335}, {x:280, y:384}, {x:199, y:341}, {x:204, y:268}, {x:278, y:213}, {x:382, y:192}, {x:432, y:164}, {x:421, y:89}, {x:537, y:45}, {x:656, y:54}, {x:640, y:161}, {x:673, y:208}, {x:789, y:377}, {x:788, y:436}, {x:736, y:480}, {x:645, y:352}, {x:667, y:450}, {x:656, y:525}, {x:714, y:588}, {x:785, y:700},
{x:1000, y: 700}, 
{x:1000, y: 0}, 
{x:0, y: 0}, 
],
[ 
{x:0, y: 700}, 
{x:360, y:700}, {x:378, y:467}, {x:404, y:357}, {x:321, y:278}, {x:277, y:227}, {x:309, y:205}, {x:415, y:119}, {x:431, y:103}, {x:398, y:61}, {x:425, y:19}, {x:505, y:14}, {x:625, y:33}, {x:627, y:72}, {x:567, y:113}, {x:629, y:133}, {x:687, y:205}, {x:696, y:267}, {x:633, y:316}, {x:606, y:341}, {x:642, y:468}, {x:678, y:549}, {x:662, y:700},
{x:1000, y: 700}, 
{x:1000, y: 0}, 
{x:0, y: 0}, 
],
[ 
{x:0, y: 700}, 
{x:417, y:700}, {x:401, y:522}, {x:368, y:431}, {x:352, y:315}, {x:305, y:310}, {x:237, y:295}, {x:165, y:193}, {x:147, y:91}, {x:220, y:65}, {x:288, y:105}, {x:357, y:97}, {x:324, y:45}, {x:344, y:13}, {x:465, y:9}, {x:553, y:28}, {x:523, y:74}, {x:557, y:77}, {x:622, y:51}, {x:681, y:163}, {x:662, y:230}, {x:593, y:257}, {x:739, y:278}, {x:801, y:409}, {x:782, y:503}, {x:713, y:571}, {x:629, y:500}, {x:620, y:408}, {x:540, y:431}, {x:568, y:540}, {x:598, y:700},
{x:1000, y: 700}, 
{x:1000, y: 0}, 
{x:0, y: 0}, 
],
[ 
{x:0, y: 700}, 
{x:388, y:700}, {x:352, y:556}, {x:298, y:505}, {x:268, y:409}, {x:251, y:322}, {x:347, y:308}, {x:431, y:287}, {x:452, y:244}, {x:583, y:212}, {x:666, y:267}, {x:644, y:304}, {x:745, y:331}, {x:843, y:392}, {x:797, y:485}, {x:769, y:579}, {x:712, y:700},
{x:1000, y: 700}, 
{x:1000, y: 0}, 
{x:0, y: 0}, 
],
[ 
{x:0, y: 700}, 
{x:415, y:700}, {x:406, y:583}, {x:395, y:446}, {x:439, y:394}, {x:392, y:355}, {x:341, y:303}, {x:308, y:257}, {x:351, y:214}, {x:397, y:157}, {x:440, y:117}, {x:433, y:66}, {x:470, y:18}, {x:566, y:16}, {x:645, y:28}, {x:723, y:76}, {x:760, y:142}, {x:681, y:182}, {x:652, y:236}, {x:668, y:350}, {x:712, y:449}, {x:735, y:599}, {x:730, y:700},
{x:1000, y: 700}, 
{x:1000, y: 0}, 
{x:0, y: 0}, 
],
[ 
{x:0, y: 700}, 
{x:382, y:700}, {x:421, y:536}, {x:459, y:493}, {x:480, y:399}, {x:386, y:450}, {x:331, y:382}, {x:406, y:264}, {x:454, y:152}, {x:487, y:104}, {x:450, y:61}, {x:532, y:17}, {x:620, y:17}, {x:647, y:105}, {x:708, y:79}, {x:786, y:32}, {x:881, y:47}, {x:864, y:123}, {x:795, y:194}, {x:654, y:218}, {x:673, y:308}, {x:706, y:414}, {x:742, y:475}, {x:768, y:560}, {x:813, y:625}, {x:798, y:700},
{x:1000, y: 700}, 
{x:1000, y: 0}, 
{x:0, y: 0}, 
],
[ 
{x:0, y: 700}, 
{x:346, y:663}, {x:324, y:557}, {x:303, y:489}, {x:381, y:436}, {x:442, y:422}, {x:431, y:363}, {x:430, y:306}, {x:365, y:273}, {x:285, y:200}, {x:237, y:127}, {x:264, y:85}, {x:321, y:96}, {x:415, y:150}, {x:502, y:196}, {x:472, y:133}, {x:540, y:125}, {x:641, y:133}, {x:622, y:188}, {x:678, y:156}, {x:786, y:107}, {x:889, y:88}, {x:895, y:158}, {x:845, y:202}, {x:742, y:255}, {x:691, y:311}, {x:732, y:414}, {x:798, y:471}, {x:833, y:560}, {x:804, y:659},
{x:1000, y: 700}, 
{x:1000, y: 0}, 
{x:0, y: 0}, 
],
];

// RESETS 'HOLE IN THE WALL' GAME HOLE
// NEEDS TO BE CREATED AFTER HOLE COORDINATES ARE DEFINED
var rand_hole
function resetHoleInTheWall() {
  rand_hole = getRandom(0, hole_in_the_wall.length);
}
// SINCE THE STARTING VARIABLES ARE EMPTY, THE NEED TO BE RESET IN THE BEGINNING
resetHoleInTheWall();

// PREDEFINED p5.js FUNCTION WHICH IS CALLED WHEN THE PoseNet API MODEL IS LOADED
function modelReady() {
  select('#status').html('Model Loaded');
}

// PREDEFINED p5.js FUNCTION WHICH IS CALLED REPETITIVELY
// DRAWS EACH JAVASCRIPT CANVAS FRAME
function draw() {
  image(video, 0, 0, width, height);
  // RESETS THE HITBOX OF THE AVATAR
  hitbox_body = [];

  // UPDATES THE BACKGROUND OF THE GAME PAGE
  updateBackground();

  // DRAWS THE AVATAR'S BODY AND HIPS
  drawBody();
  // DRAWS HEAD ONTOP OF BODY
  drawHead();
  // DRAWS ARMS AND LEGS ONTOP OF BODY
  drawLimbs();

  // WILL DRAW THE HITBOXES IF THE OPTION IS SELECTED
  if(show_hitboxes){
    // THE MAIN ORANGE HIGHLIGHT AROUND THE BODY
    // THIS IS THE MOST IMPORTANT ONE AS IT IS CONNECTED TO THE hitbox_body VARIABLE
    // WHICH DENOTES ALL THE CONTACT DETECTION IN THE AVATAR
  	drawHitbox();

    // BLACK DOTS AROUND BODY
    // DRAWS THE SPECIFIC POINTS IN THE AVATAR
    // FOR EXAMPLE, EYES, NOSE, EARS
  	drawKeypoints();

    // OCCASIONAL RED LINES CONNECTING LIMBS
    // COMES WITH THE API
    drawSkeleton();
  }

  // WILL DRAW THE GAME IF ONE IS SELECTED
  if(gamemode==1){
    // POINT TAPPING
  	drawPoint();
  }else if(gamemode==2){
    // HOLE IN THE WALL
  	drawHole();
  }else if(gamemode==3){
    // DODGE POINT
    drawDodgePoint();
 }

}

// DRAWS SMALL ELLIPSES OVER DETECTED KEYPOINTS
function drawKeypoints()  {
  // LOOP THROUGH FIRST POSE DETECTED
  for (let i = 0; i < Math.min(poses.length, 1); i++) {
    // FOR THE DETECTED POSE, LOOP THROUGH ALL THE KEYPOINTS
    let pose = poses[i].pose;
    for (let j = 0; j < pose.keypoints.length; j++) {
      // A KEYPIINT IS AN OBJECT DESCRIBING A BODY PART (LIKE rightARM OR leftShoulder)
      let keypoint = pose.keypoints[j];
      // ONLY DRAW THE ELLIPSE IF THE POSE PROBABILITY IS ABOVE THE THRESHOLD
      // THE POSE PROBABILITY IS THE PROBABILITY THE API IS CORRECT
      // THE DEFAULT THRESHOLD IS AT 0.2 OR 20%
      if (keypoint.score > threshold) {
        fill(255, 0, 0);
        noStroke();
        ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
        ctx.fillStyle = "black";
        ctx.fillRect(keypoint.position.x,keypoint.position.y,7,7);
      }
    }
  }
}

// DRAWS THE DETECTED SKELETONS
function drawSkeleton() {
  // LOOP THROUGH ALL SKELETONS DETECTED OF THE FIRST POSE
  for (let i = 0; i < Math.min(poses.length, 1); i++) {
    let skeleton = poses[i].skeleton;
    // FOR EACH SKELETON, LOOP THROUGH ALL BODY CONNECTIONS
    for (let j = 0; j < skeleton.length; j++) {
      // GET TWO CONNECTED PARTS
      let partA = skeleton[j][0];
      let partB = skeleton[j][1];
      // DRAW RED LINE CONNECTING THEM
      stroke(255, 0, 0);
      line(partA.position.x, partA.position.y, partB.position.x, partB.position.y);
      ctx.beginPath();
      ctx.lineTo(partA.position.x, partA.position.y);
      ctx.lineTo(partB.position.x, partB.position.y);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#ff0000';
      ctx.stroke();
    }
  }
}

// DRAWS THE HEAD OF THE AVATAR
function drawHead() {
  // LOOP THROUGH THE FIRST DETECED POSE
  for(let i = 0; i < Math.min(poses.length, 1); i++){
    let pose = poses[i].pose;

    // SET head_width TO BE THE AVERAGE OF THE DISTANCES BETWEEN THE NOSE AND THE EARS
    // THE head_width THE HORIZONTAL RADIUS OF THE HEAD, NOT THE HORIZONTAL DIAMETER
    var r1 = distanceP(pose.leftEar.x, pose.leftEar.y, pose.nose.x, pose.nose.y);
    var r2 = distanceP(pose.rightEar.x, pose.rightEar.y, pose.nose.x, pose.nose.y);
    // FAILSAFE SINCE IT IS NOT GUARENTEED THAT THE LEFT EAR, RIGHT EAR OR NOSE ARE ALL DETECTED
    // THE distanceP FUNCTION WILL RETURN NULL OF ANY OF THE POINTS ARE NULL
    // IF SO, SIMPLY TAKE THE VALUE WHICH IS NOT NULL
    // IF BOTH VALUES ARE NULL, SIMPLY SET THE head_width TO NULL
    var head_width;
    if(r1!=null&&r2!=null){
      head_width = (r1+r2)/2;
    }else if(r1==null&&r2!=null){
      head_width = r1;
    }else if(r1!=null&&r2==null){
      head_width = r2;
    }else if(r1==null&&r2==null){
      head_width = null;
    }

    // SET head_height TO BE THE DISTANCE FROM THE MIDDLE OF THE SHOULDERS TO THE NOSE
    // DIVIDE head_height BY THE head_height_ratio OPTION TO TWEAK THE AVATAR HEAD'S HEIGHT
    var shoulder_mid = midpointP(pose.leftShoulder.x, pose.leftShoulder.y, pose.rightShoulder.x, pose.rightShoulder.y);
    var head_height = distanceP(pose.nose.x, pose.nose.y, shoulder_mid.x, shoulder_mid.y)/head_height_ratio;

    // IF THE head_width IS AVAILABLE, SET USE IT TO SET A MINIMUM VALUE FOR THE HEAD HEIGHT
    // THIS PREVENTS THE HEAD HEIGHT FROM BEING LOWER THAN A CERTAIN POINT
    // THAT CERTAIN POINT BEING THE head_width DIVIDED BY THE head_width_to_height OPTION
    // THIS IS USED WHEN, FOR EXAMPLE THE USER IS LOOKING DOWN
    // THE MIDPOINT OF THE SHOULDERS WILL BECOME TOO CLOSE TO THE DETECTED NOSE AND 'SQUISH' THE HEAD
    if(head_width!=null){
      head_height = Math.max(head_height, head_width/head_width_to_height);
    }

    // SET THE MIDDLE FO THE HEAD TO THE MIDPOINT BETWEEN THE LEFT EAR AND RIGHT EAR
    var head_mid_x, head_mid_y;
    var head_point = midpointP(pose.leftEar.x, pose.leftEar.y, pose.rightEar.x, pose.rightEar.y);
    // FAILSAFE IN THE CASE THE LEFT EAR OR RIGHT EAR IS NOT DETECTED, RETURNING NULL
    // SET THE HEAD TO THE NOSE
    if(head_point!=null){
      head_mid_x = head_point.x;
      head_mid_y = head_point.y;
    }else{
      head_mid_x = pose.nose.x;
      head_mid_y = pose.nose.y;
    }
    // SET THE HEAD ROTATION TO THE ROTATION BETWEEN THE LEFT EAR AND THE RIGHT EAR
    var head_rotation = rotationP(pose.leftEar.x, pose.leftEar.y, pose.rightEar.x, pose.rightEar.y);
    // FAILSAFE IN THE CASE EITHER LEFT EAR OR RIGHT EAR IS NOT DETECTED, RETURNING NULL
    // WILL SET HEAD ROTATION TO 0
    if(head_rotation==null)
      head_rotation = 0;

    // THIS WAS A TESTING FUNCTION WHICH DREW AN ELLIPSE AROUND CALCULATED HEAD COORDINATES
    /*
    ctx.beginPath();
    if(head_width!=null&&head_height!=null){
      tx.ellipse(head_mid_x, head_mid_y, head_width, head_height, head_rotation, 0, 2 * Math.PI);
    }
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ff0000';
    ctx.stroke();
    */

    // SET THE NECK POSITION TO THE MIDPOINT BETWEEN THE MIDDLE OF THE HEAD AND THE MIDDLE OF THE SHOULDERS
    var neck_pos = midpointP(head_mid_x, head_mid_y, shoulder_mid.x, shoulder_mid.y);
    // SET THE NECK HEIGHT TO THE DISTANCE BETWEEN THE NECK POSITION AND THE MIDDLE OF THE SHOULDERS
    var neck_height = distanceP(neck_pos.x, neck_pos.y, shoulder_mid.x, shoulder_mid.y);
    // SET THE WIDTH OF THE NECK TO THE neck_height MULTIPLIED BY THE neck_width_ratio OPTION
    // THIS IS NEEDED AS THIS WAY, THE WIDTH IS PROPORTIONAL TO THE HEIGHT
    // THIS PREVENTS A CONSTANT WIDTH
    // FOR EXAMPLE, WHEN A PERSON TAKES A STEP BACK, THE WIDTH OF THEIR NECK WOULD APPEAR TO REDUCE
    // HOWEVER, IF THE VALUE WERE CONSTANT, THE WIDTH OF THE NECK WOULD NOT, WHICH WOULD NOT BE REALISTIC
    var neck_width = neck_height * neck_width_ratio;

    // DRAW THE NECK CENTERED AT THE neck_pos, TO THE SAME ROTATION AS THE HEAD
    imageCenter(neck_pos.x, neck_pos.y, neck_width*head_image_ratio, neck_height*head_image_ratio, head_rotation, "neck");
    // DRAW THE HEAD ONTOP OF THE NECK, CENTERED AT THE head_mid, TO THE ROTATION OF head_rotation
    imageCenter(head_mid_x, head_mid_y, head_width*head_image_ratio, head_height*head_image_ratio, head_rotation, "head");
    // THE IMAGES ARE STRETCHED BY A FACTOR OF THE head_image_ratio OPTION TO ALLOW USERS TO EDIT THE SIZE OF THEIR HEAD

    // THIS ADDS THE NECK AND HEAD COORDINATES ONTO THE HITBOX ARRAY, CREATING THE SHAPE OF A HEAD
    hitbox_body.push({x: neck_pos.x-neck_width/2, y: neck_pos.y});
    hitbox_body.push({x: head_mid_x-head_width, y: head_mid_y});
    hitbox_body.push({x: head_mid_x, y: head_mid_y-head_height});
    hitbox_body.push({x: head_mid_x+head_width, y: head_mid_y});
    hitbox_body.push({x: neck_pos.x+neck_width/2, y: neck_pos.y});
  }
}

// DRAWS THE ARMS AND LEGS OF THE AVATAR
function drawLimbs() {
  // LOOP THROUGH THE FIRST POSE DETECTED
  for(let i = 0; i < Math.min(poses.length, 1); i++){
    let pose = poses[i].pose;
    // DRAW EACH OF THE COORDINATES ALONG THE DETECTED KEYPOINTS
    // FOR EXAMPLE, THE leftShoulder LIMB IS DRAWN
    // FROM THE LEFT SHOULDER KEYPOINT TO THE LEFT ELBOW KEYPOINT
    imageLength(pose.leftShoulder.x, pose.leftShoulder.y, 
      pose.leftElbow.x, pose.leftElbow.y, "leftShoulder");
    imageLength(pose.rightShoulder.x, pose.rightShoulder.y, 
      pose.rightElbow.x, pose.rightElbow.y, "rightShoulder", true);
    imageLength(pose.leftElbow.x, pose.leftElbow.y, 
      pose.leftWrist.x, pose.leftWrist.y, "leftArm");
    imageLength(pose.rightElbow.x, pose.rightElbow.y, 
      pose.rightWrist.x, pose.rightWrist.y, "rightArm", true);
    imageLength(pose.leftHip.x, pose.leftHip.y, 
      pose.leftKnee.x, pose.leftKnee.y, "leftThigh");
    imageLength(pose.rightHip.x, pose.rightHip.y, 
      pose.rightKnee.x, pose.rightKnee.y, "rightThigh", true);
    imageLength(pose.leftKnee.x, pose.leftKnee.y, 
      pose.leftAnkle.x, pose.leftAnkle.y, "leftFoot");
    imageLength(pose.rightKnee.x, pose.rightKnee.y, 
      pose.rightAnkle.x, pose.rightAnkle.y, "rightFoot", true);
  }
}

// DRAWS THE BODY AND THE HIPS OF THE AVATAR
function drawBody() {
  // LOOP THROUGH THE FIRST POSE DETECTED
  for(let i = 0; i < Math.min(poses.length, 1); i++){
    let pose = poses[i].pose;
    // DRAW THE HIPS OF THE AVATAR
    imageHip(pose.leftHip.x, pose.leftHip.y, 
      pose.rightHip.x, pose.rightHip.y, "hip");
    // DRAW THE BODY OF THE AVATAR ONTOP OF THE HIPS
    imageChest(pose.leftShoulder.x, pose.leftShoulder.y, 
      pose.rightShoulder.x, pose.rightShoulder.y, "chest", pose.leftHip.x, pose.leftHip.y, pose.rightHip.x, pose.rightHip.y);

    // ADD THE HIBOXES OF THE ARMS AND LEGS TO THE HITBOX ARRAY, CREATING AMD AND LEG SHAPES
    addHitboxArm(pose.leftShoulder, pose.leftElbow, pose.leftWrist);
    addHitboxLeg(pose.leftHip, pose.leftKnee, pose.leftAnkle)
    addHitboxLeg(pose.rightHip, pose.rightKnee, pose.rightAnkle);
    addHitboxArm(pose.rightShoulder, pose.rightElbow, pose.rightWrist);
  }
}

// ADDS THE HITBOX COORDINATES OF THE ARMS TO THE HITBOX ARRAY
// PART A IS THE SHOULDER, PART B IS THE ELBOW, AND PART C IS THE WRIST
function addHitboxArm(partA, partB, partC) {
  // SINCE THE HITBOX IS A SHAPE AND NOT A LINE, MANY COORDINATES NEED TO BE SHIFTED UP OR DOWN INTO TWO COORDINATES
  // TO MAKE THEM SHAPES
  // FOR EXAMPLE, A HORIZONTAL LINE BECOMING A RECTANGLE
  // THIS SHIFTS THE SHOULDER BY A FACTOR OF THE DISTANCE BETWEEN THE SHUOLDER AND THE ELBOW DIVIDED BY limb_width_ratio, THEN DIVIDED BY 2
  var shoulder_shift = distanceP(partA.x, partA.y, 
    partB.x, partB.y,)/limb_width_ratio/2;
  hitbox_body.push({x: partA.x, y: partA.y-shoulder_shift});

  // SHIFTS THE ELBOW COORDINATES
  // THIS TIME, IT IS DEPENDENT ON THE ROTATION OF THE ELBOW
  // AS WHILE SHOULDERS CAN BE SHIFTED UP AND DOWN
  // ELBOWS NEED TO BE SHIFTED PERPENDICULAR TO THEIR ANGLE
  var shoulder_pos = partB;
  var shoulder_shift = distanceP(partA.x, partA.y, partB.x, partB.y,)/limb_width_ratio/2;
  // TAKES ROTATION OF THE ARM
  var shoulder_rotation = rotationP(partA.x, partA.y, partB.x, partB.y);
  // TAKES THE PERPENDICULAR ANGLE OF THE ARM
  var shoulder_rotation_inv = Math.PI/2-shoulder_rotation;
  hitbox_body.push({x: shoulder_pos.x+Math.cos(shoulder_rotation_inv)*shoulder_shift, 
    y: shoulder_pos.y-Math.sin(shoulder_rotation_inv)*shoulder_shift});

  // SHIFTS THE WRIST COORDINATES
  // SIMILAR TO THE ELBOW, NEEDS TO BE SHIFTED PERPENDICULAR TO ITS ANGLE
  var arm_pos = partC;
  var arm_shift = distanceP(partB.x, partB.y, partC.x, partC.y,)/limb_width_ratio/2;
  // TAKES ROTATION OF ARM
  var arm_rotation = rotationP(partB.x, partB.y, partC.x, partC.y);
  // TAKES PERPENDICULAR ANGLE OF ARM
  var arm_rotation_inv = Math.PI/2-arm_rotation;
  hitbox_body.push({x: arm_pos.x+Math.cos(arm_rotation_inv)*arm_shift, 
    y: arm_pos.y-Math.sin(arm_rotation_inv)*arm_shift});
  hitbox_body.push({x: arm_pos.x-Math.cos(arm_rotation_inv)*arm_shift, 
    y: arm_pos.y+Math.sin(arm_rotation_inv)*arm_shift});

  hitbox_body.push({x: shoulder_pos.x-Math.cos(shoulder_rotation_inv)*shoulder_shift, 
    y: shoulder_pos.y+Math.sin(shoulder_rotation_inv)*shoulder_shift});

  hitbox_body.push({x: partA.x, y: partA.y+shoulder_shift});
  // OPPOSITE SHIFTED COORDINATES THEN NEED TO BE ADDED BACK TO THE HITBOX ARRAY
  // FOR EXAMPLE, SUPPOSE THE BELOW IS THE DETECTED CONNECTION OF AN ARM

  // \    <--SHOULDER
  //  \ 
  //   \  <-- ELBOW
  //    |
  //    |
  //    |  <-- WRIST

  // THE CREATED HITBOX WOULD THEN BE

  // |\   <--SHOULDER
  // |  \
  //  \   \  
  //   \    \  <--ELBOW
  //    |    |
  //    |    |
  //    |____|  <--WRIST

  // IF THE HITBOX POINTS WERE (*), IN THE DIAGRAM, THEY WOULD BE

  // *\   <--SHOULDER
  // |  \
  // *\   \  
  //   \    *   <--ELBOW
  //    *    |
  //    |    |
  //    *____*  <--WRIST
}

// ADDS THE HITBOX COORDINATES OF THE ARMS TO THE HITBOX ARRAY
// PART A IS THE HIP, PART B IS THE KNEE, AND PART C IS THE FOOT
function addHitboxLeg(partA, partB, partC){
  // HORIZONAL SHIFT OF THE HIP COORDINATES, INSTEAD OF VERTICAL LIKE THE SHOULDER
  var hip_shift = distanceP(partA.x, partB.y, 
    partB.x, partB.y,)/limb_width_ratio/2;
  hitbox_body.push({x: partA.x-hip_shift, y: partA.y});
  
  // SIMILAR ROTATION-DEPENDENT SHIFT IN THE KNEE, LIKE THE ELBOW
  var thigh_pos = partB;
  var thigh_shift = distanceP(partA.x, partA.y, partB.x, partB.y,)/limb_width_ratio/2;
  var thigh_rotation = rotationP(partA.x, partA.y, partB.x, partB.y);
  var thigh_rotation_inv = Math.PI/2-thigh_rotation;
  hitbox_body.push({x: thigh_pos.x+Math.cos(thigh_rotation_inv)*thigh_shift, 
    y: thigh_pos.y-Math.sin(thigh_rotation_inv)*thigh_shift});

  // SIMILAR ROTATION-DEPENDENT SHIFT IN THE FOOT, LIKE THE WRIST
  var foot_pos = partC;
  var foot_shift = distanceP(partB.x, partB.y, partC.x, partC.y,)/limb_width_ratio/2;
  var foot_rotation = rotationP(partB.x, partB.y, partC.x, partC.y);
  var foot_rotation_inv = Math.PI/2-foot_rotation;
  hitbox_body.push({x: foot_pos.x+Math.cos(foot_rotation_inv)*foot_shift, 
    y: foot_pos.y-Math.sin(foot_rotation_inv)*foot_shift});
  hitbox_body.push({x: foot_pos.x-Math.cos(foot_rotation_inv)*foot_shift, 
    y: foot_pos.y+Math.sin(foot_rotation_inv)*foot_shift});

  hitbox_body.push({x: thigh_pos.x-Math.cos(thigh_rotation_inv)*thigh_shift, 
    y: thigh_pos.y+Math.sin(thigh_rotation_inv)*thigh_shift});

  hitbox_body.push({x: partA.x+hip_shift, y: partA.y});

  // OPPOSITE SHIFTED COORDINATES THEN NEED TO BE ADDED BACK TO THE HITBOX ARRAY
  // FOR EXAMPLE, SUPPOSE THE BELOW IS THE DETECTED CONNECTION OF AN LEG

  // |   <--HIP
  // |
  // |
  //  \  <--KNEE
  //   \
  //    \  <--FOOT

  // THE CREATED HITBOX WOULD THEN BE

  // ____
  // |  |   <--HIP
  // |  |
  // |  |
  //  \  \  <--KNEE
  //   \  \
  //    \__\  <--FOOT

  // IF THE HITBOX POINTS WERE (*), IN THE DIAGRAM, THEY WOULD BE

  // *__*
  // |  |   <--HIP
  // |  |
  // |  *
  //  *  \  <--KNEE
  //   \  \
  //    *__*  <--FOOT
}

// DRAWS THE DETECTED HITBOX
function drawHitbox() {
  ctx.beginPath();
  // CONNECTS EACH POINT ON THE HITBOX
  for(point of hitbox_body){
    ctx.lineTo(point.x, point.y);
  }
  // CONNECTS FINAL HITBOX LINE
  if(hitbox_body.length>1)
    ctx.lineTo(hitbox_body[0].x, hitbox_body[0].y);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'orange';
  // SETS THE LINE TO PARTIALLY TRANSPERENT
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// DRAWS THE POINT IN 'POINT TAPPING'
function drawPoint() {
  ctx.beginPath();
  // DEFAULT COLOUR IS ORANGE
  ctx.strokeStyle = 'orange';
  // CONNECT EVERY POINT AROUND THE test_point_pos, WHICH FORM A CIRCLE
  // AND ARE IN THE ARRAY test_point
  for(point of test_point){
    ctx.lineTo(point.x, point.y);
    // IF ANY OF THE POINTS COME IN CONTACT WITH THE HITBOX, RESET THE CIRCLE
    // AND FLASH THE COLOUR GREEN
    if(isPointInPoly(hitbox_body, point)){
      ctx.strokeStyle = 'green';
      resetTestPoint();
    }
  }
  ctx.lineWidth = 5;
  ctx.stroke();

}

// DRAWS THE POINTS IN 'DODGE POINTS'
function drawDodgePoint() {
  updateDodgePoint();
  // WILL UPDATE THE DODGE POINTS EVERY FRAME TO TEST FOR CONTACT
  // AND INCREASE THEIR RADIUS
  // LOOP THROUGH EACH DODGE POINT
  for(var k = 0; k<dodge_points.length; k++){
    points = dodge_points[k];
    ctx.beginPath();
    var dodge_point_flag = false;
    ctx.strokeStyle = 'orange';
    // CONNECT LINE AROUND EVERY POINT IN dodge_points FOR POINT k, IF POSSIBLE
    for(var i = 0; i<points?.length; i++){
      point = points[i];
      ctx.lineTo(point.x, point.y);
      // TEST IF POINT COMES INTO CONTACT WITH THE HITBOX, AND IS ABOVE A CERTAIN RADIUS, dodge_points_radius_hit
      // IF SO, RESTE THE POINT
      if(isPointInPoly(hitbox_body, point)&&dodge_points_radius[k]>=dodge_points_radius_hit){
        resetDodgePoint(k)
        dodge_point_flag = true;
        break;
      // IF THE POINT IS ABOVE A CERTAIN RADIUS, dodge_points_radius_hit
      // SET THE COLOUR TO RED, TO SHOW THAT THE USER CAN NOW HIT OR COME INTO CONTACT WITH THIS POINT
      }else if(dodge_points_radius[k]>=dodge_points_radius_hit){
        ctx.strokeStyle = 'red';
      }
      if(dodge_point_flag)
      	break;
    }
    if(dodge_point_flag)
    	continue;
    ctx.lineWidth = 5;
    ctx.stroke();
  }

}

// DRAWS THE HOLE IN 'HOLE IN THE WALL'
function drawHole() {
  // ADDS ONE FRAME TO THE TIMER
  t++;
  // DRAWS A RANDOM HOLE
  ctx.beginPath();
  hole = hole_in_the_wall[rand_hole];
  // IF THE CURRENT TIME, t, IS BELOW THE time_period, MEANING USER CAN NOT YET COME INTO CONTACT WITH THE HOLE
  if(t<=time_period){
    hole_flag = false;
    for(point of hole){
      ctx.lineTo(point.x, point.y);
      // IF THE USER IS ON A PATH TO HIT THE HOLE, SET THE HOLE TO RED TO WARN THE USER
      if(isPointInPoly(hitbox_body, point)){
        ctx.fillStyle = '#ff7c73';
        hole_flag = true;
      }
    }
    // OTHERWISE, SET THE HOLE FLAG TO ORANGE
    // SHOWING THAT THE USER WILL FIT THROUGH THIS HOLE IF THEY STAY IN THEIR CURRENT POSITION
    if(hole_flag == false)
      ctx.fillStyle = 'orange';
  // IF THE CURRENT TIME IS ABOVE THE time_period AND BELOW THE result_period
  // WHICH MEANS THE HOLE HAS NOW HIT OR PASSED THE USER
  }else if(t>time_period&&t<=time_period+result_period){
    for(point of hole){
      ctx.lineTo(point.x, point.y);
    }
    if(hole_flag==true){
      // IF THE HOLE HIT THE USER, LET THE USER KNOW THEY FAILED THIS HOLE, FOR THE result_period
      ctx.fillStyle = 'red';
    }else{
      // IF THE HOLE PASSES THE USER, LET THE USER KNOW THEY PASSED THIS HOLE, FOR THE result_period
      ctx.fillStyle = 'green';
    }
  }else if(t>time_period+result_period){
    // RESET THE HOLE AND THE TIMER ONCE THE result_period IS FINISHED
    t = 0;
    hole_flag = false;
    resetHoleInTheWall();
  }
  
  // MAKE THE HOLE TRANSPERENT
  ctx.globalAlpha = 0.2;
  ctx.fill();
  ctx.globalAlpha = 1;

}

// FILLS THE BACKGROUND WITH A WHITE RECTANGLE TO RESET THE FRAME OF THE JAVASCRIPT CANVAS
function updateBackground() {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
}

function imageCenter(x, y, w, h, rot, imageName){
  if(x!=null&&y!=null&&w!=null&&h!=null){
    // SETS THE VALUES  OF THE imageName AS A WEIGHTED AVERAGE BETWEEN THE CACHED VALUE AND THE CURRENT VAUE
    // FOR EXAMPLE, IF THE CURRENT X VALUE FOR THE leftShoulder WERE 10, THE CACHED VALUE WERE 20
    // AND smoothness = [1][5]
    // THE DRAWN X COORDINATE WOULD BE
    // (10 * 1 + 20 * 5)/(1 + 5) = 110/6 = 18.33
    x = (x*smoothness[0]+cache[imageName].x*smoothness[1])/(smoothness[0]+smoothness[1]);
    y = (y*smoothness[0]+cache[imageName].y*smoothness[1])/(smoothness[0]+smoothness[1]);
    w = (w*smoothness[0]+cache[imageName].w*smoothness[1])/(smoothness[0]+smoothness[1]);
    h = (h*smoothness[0]+cache[imageName].h*smoothness[1])/(smoothness[0]+smoothness[1]);
    // THIS IS DONE TO REDUCE THE 'TWITCHING' BETWEEN FRAMES
    // THE API OFTEN DETECTS POINTS SLIGHTLY OFF FROM THE PREVIOUSLY DETECTED POINT
    // WHICH CREATES A TWITCHING EFFECT IN THE AVATAR
    // THE SMOOTHNESS REDUCES THE EFFECTS OF THESE SMALL INCONSISTENCIES BETWEEN POINTS
    // REDUCING THE TWITCHING

    // SINCE THE TAN FUNCTION ONLY RETURNS VALUES 0º-180º, ON A 360º SCALE
    // PASSING BETWEEN ANGLES NEEDS TO BE CORRECTED
    // FOR EXAMPLE, IF THE ANGLE OF A LIMB WERE TO GO FROM 178º --> -3º,
    // THE LIMB WOULD INHUMANELY ROTATE ON THE AVATAR INSTEAD OF PASSING THROUGH THE VALUES SMOOTHLY
    // THIS SIMPLY PREVENTS THAT FROM HAPPENING
    limbs = ["leftShoulder", "leftArm", "rightShoulder", "rightArm", "leftThigh", "leftFoot", "rightThigh", "rightFoot"];
    if(limbs.includes(imageName)){
      if(rot<Math.PI/2&&cache[imageName].rot>Math.PI*3/2)
        cache[imageName].rot = cache[imageName].rot -Math.PI*2;
      else if(rot>Math.PI*3/2&&cache[imageName].rot<Math.PI/2)
        cache[imageName].rot = cache[imageName].rot +Math.PI*2;
      else if(rot>Math.PI/2&&cache[imageName].rot<-Math.PI/2)
        cache[imageName].rot = cache[imageName].rot +Math.PI*2;
      else if(rot<-Math.PI/2&&cache[imageName].rot>Math.PI/2)
        cache[imageName].rot = cache[imageName].rot -Math.PI*2;
    }

    // SETS THE ROTATION TO THE WEIGHTED AVERAGE ONCE CORRECTED FOR BY THE LIMBS
    rot = (rot*smoothness[0]+cache[imageName].rot*smoothness[1])/(smoothness[0]+smoothness[1]);

    // GRABS THE IMAGE ASSOCIATED WITH THE imageName
    // DRAWS THAT IMAGE AT THE CENTER OF THE X AND Y COORDINATES, TO THE CORRECT ROTATION
    var image = document.getElementById(imageName);
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.drawImage(image, -w/2, -h/2, w, h);
    ctx.rotate(-rot);
    ctx.translate(-x, -y);

    // UPDATES THE CACHE TO THE NEW VALUES
    cache[imageName] = {x, y, w, h, rot, imageName};
  }else{
    // IF ONE OF THE VALUES IS NULL, SIMPLY USE THE CACHED IMAGE
    // THIS PREVENTS THE PROBLEM OF SAY, ONE OF THE ELBOW KEYPOINTS NOT BEING DETECTED IN ONE FRAME
    // WITHOUT THIS, THE ARM OF THE AVATAR WOULD SUDDENLY DISAPPEAR FOR ONE FRAME
    // THIS SIMPLE USES THE PREVIOUSLY DETECTED PART OF NO CURRENT PART IS DETECTED
    part = cache[imageName];
    imageCenter(part.x, part.y, part.w, part.h, part.rot, part.imageName);
  }
}

// THIS DRAWS A LIMB ALONG THE (x1, y1) COORDINATES TO THE (x2, y2) COORDINATES
// IT ALSO ALLOWS USING THE PERPENDICULAR ANGLE, WHICH IS REQUIRED FOR CERTAIN LIMBS
function imageLength(x1, y1, x2, y2, imageName, inv) {
  if(inv!=true){
    inv = false;
  }
  // DRAWS THE IMAGE AT THE MIDPOINT OF THE TWO COORDINATES, TO THEIR ROTATION
  var part_position = midpointP(x1, y1, x2, y2);
  var part_length = distanceP(x1, y1, x2, y2);
  if(inv==false){
    var part_rotation = rotationP(x1, y1, x2, y2)-Math.PI/2;
  }else if(inv==true){
    var part_rotation = rotationP(x1, y1, x2, y2)+Math.PI/2;
  }
  
  imageCenter(part_position.x, part_position.y, part_length/limb_width_ratio, 
    part_length*limb_length_ratio, part_rotation, imageName);
}

// DRAWS THE CHEST OF THE AVATAR
// FOUR COORDINATES PASSED IN ARE THE COORDINATES OF THE 
// LEFT SHOULDER, RIGHT SHOULDER, LEFT HIP AND RIGHT HIP, IN THAT ORDER
function imageChest(x1, y1, x2, y2, imageName, x3, y3, x4, y4) {
  // SETS THE POSITION OF THE PART TO THE MIDPOINT OF THE MIDPOINTS OF THE FOUR COORDINATES
  // FOR EXAMPLE, IF GIVEN THE COORDINATES OF A RECTANGLE, THIS RETURN THE CENTER
  var part_position = midpointP(midpointP(x1, y1, x2, y2).x, midpointP(x1, y1, x2, y2).y*14/15,
    midpointP(x3, y3, x4, y4).x, midpointP(x3, y3, x4, y4).y*14/15);
  // SETS THE WIDTH TO THE MAXIMUM BETWEEN THE DISTANCE BETWEEN THE SHOULDERS
  // AND DISTANCE BETWEEN HIPS
  // THIS IS DONE AS WELL FOR THE HEIGHT
  var part_width = Math.max(distanceP(x1, y1, x2, y2),distanceP(x3, y3, x4, y4));
  var part_length = Math.max(distanceP(x1, y1, x3, y3),distanceP(x2, y2, x4, y4));
  // THE AVERAGE OF THE HIP AND SHOULDER ROTATIONS ARE TAKEN
  var part_rotation = (rotationP(x1, y1, x2, y2)+rotationP(x3, y3, x4, y4))/2;
  var part_rotation_inv = Math.PI/2-part_rotation;

  // DRAWS THE BODY TO THE CENTER OF THE FOUR POINTS, TO THE DEFINED LENGTH, WIDTH AND ROTATION
  imageCenter(part_position.x, part_position.y, part_width, part_length, part_rotation, imageName);
}

// SIMILAR TO THE imageChest FUNCTION, HOWEVER ONLY PASSES IN LEFT HIP AND RIGHT HIP COORDINATES
function imageHip(x1, y1, x2, y2, imageName) {
  // SETS HIP POSITION TO THE MIDPOINT OF THE HIPS
  var part_position = midpointP(x1, y1, x2, y2);
  // SETS THE HIP DISTANCE TO THE DISTANCE BETWEEN HIPS, MULTIPLIED BY THE hip_width_ratio OPTION
  var part_width = distanceP(x1, y1, x2, y2)*hip_width_ratio;
  // THE LENGTH IS EQUAL TO THE WIDTH IN THIS CASE
  var part_length = part_width;
  var part_rotation = rotationP(x1, y1, x2, y2);
  var part_rotation_inv = Math.PI/2-part_rotation;

  // DRAWS THE HIP TO THE CENTER OF THE TWO POINTS, TO THE DEFINED LENGTH, WIDTH AND ROTATION
  imageCenter(part_position.x, part_position.y, 
    part_width, part_length*hip_height_ratio, part_rotation, imageName);
}

// **** HELPER FUNCTIONS ****
// FINDS THE DISTANCE BETWEEN TWO POINTS
function distanceP(x1, y1, x2, y2) {
  if(x1==null||y1==null||x2==null||y2==null){
    return null
  }else{
    return Math.sqrt(Math.pow(x2-x1,2)+Math.pow(y2-y1,2));
  }
}

// RETURNS A OBJECT WITH THE MIDPOINT SET TO THE X AND Y COORDINATES
// OF THE MIDPOINT OF THE PASSED IN POINTS
function midpointP(x1, y1, x2, y2) {
  if(x1==null||y1==null||x2==null||y2==null){
    return null
  }else{
    return {
      x: (x1+x2)/2,
      y: (y1+y2)/2
    };
  }
}

// WILL RETURN GIVEN ROTATION BETWEEN TWO POINTS
// WILL ALSO ADD 180º IN CERTAIN CASES SINCE TAN CAN ONLY RETURN FROM 0º-180º
function rotationP(x1, y1, x2, y2) {
  if(x1==null||y1==null||x2==null||y2==null){
    return null
  }else{
    if(x2>=x1)
      return Math.atan((y2-y1)/(x2-x1));
    else
      return Math.atan((y2-y1)/(x2-x1))+Math.PI;
  }
}

// RETURNS A RANDOM NUMBER BETWEEN THE MIN AND THE MAX
function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

// TESTS IF A POINT, CONTAINING X AND Y COORDINATES, FALLS INTO A CERTAIN POLYGON, CONTAINING
// AN ARRAY OF X AND Y COORDINATES
function isPointInPoly(poly, pt){
  for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
    ((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
  && (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
  && (c = !c);
  return c;
}
