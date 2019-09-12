// from https://webgl2fundamentals.org/webgl/webgl-2d-image.html
"use strict";

var vertexShaderSource = 
`#version 300 es

in vec2 a_position;
in vec2 a_texCoord;

uniform vec2 u_resolution;
out vec2 v_texCoord;

void main() {
  vec2 zeroToOne = a_position / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0; // convert from 0->1 to 0->2
  vec2 clipSpace = zeroToTwo - 1.0; // convert from 0->2 to -1->+1 (clipspace)
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1); // flip vertical
  v_texCoord = a_texCoord;
}
`;

var fragmentShaderSource = 
`#version 300 es

precision mediump float;

uniform sampler2D u_image;
uniform sampler2D u_depth;
uniform float u_time;

in vec2 v_texCoord; // 0-1
out vec4 outColor;

void main() 
{
  vec2 coord = v_texCoord;
  float timeFrac = (sin(u_time*2.0)+1.0)/2.0; // cycle the effect over time
  //float timeFrac = fract(u_time/2.0); 

  // The texture sampler is normalizing this data. The original data is depth in meters.
  // Faking it until I can figure out how to fix that.
  float maxDepth = 4.0; 
  float d1 = 1.0; // m
  float d2 = 1.0 + 2.0 * timeFrac;  // move the camera 2.0m every second

  // Calculate how far a point on the image plane would move with change in camera position.
  float depth = texture(u_depth, coord, 0.0).x * maxDepth;
  float factor = (d1+depth)/(d2+depth);
  vec2 r = vec2(0.5) - coord;
  vec2 offset = r * factor - r;

  // This doesn't seem right, I need to do the math again.
  //float zoom = d1/d2;
  float zoom = length(offset);
  offset *= zoom;

  coord += offset;

  // Return the position shifted texture color
  outColor = texture(u_image, coord, 0.0);

  // add offset in red
  //outColor += vec4(length(offset)*10.0, 0.0, 0.0, 1.0);
  // show offset in red
  //outColor = vec4(length(offset)*10.0, 0.0, 0.0, 1.0);
}
`;

function loadImage(url, callback) {
  var image = new Image();
  image.src = url;
  image.onload = callback;
  return image;
}

function loadImages(urls, callback) {
  var images = [];
  var imagesToLoad = urls.length;

  // Called each time an image finished loading.
  var onImageLoad = function() {
    --imagesToLoad;
    // If all the images are loaded call the callback.
    if (imagesToLoad == 0) {
      callback(images);
    }
  };

  for (var ii = 0; ii < imagesToLoad; ++ii) {
    var image = loadImage(urls[ii], onImageLoad);
    images.push(image);
  }
}

loadImages([
    //"pics/kate1.jpg",
    //"pics/kate1-depth.png",
    "pics/pat1.jpg",
    "pics/pat1-depth.png",
], render)

function render(images) 
{
  var canvas = document.getElementById("canvas");
  var gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  var program = webglUtils.createProgramFromSources(gl,
      [vertexShaderSource, fragmentShaderSource]);
  window.program = program;

  var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  var texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");
  var resolutionLocation = gl.getUniformLocation(program, "u_resolution");

  // Create a vertex array object (attribute state)
  var vao = gl.createVertexArray();

  // and make it the one we're currently working with
  gl.bindVertexArray(vao);

  // Create a buffer and put a single pixel space rectangle in
  // it (2 triangles)
  var positionBuffer = gl.createBuffer();

  // Turn on the attribute
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      positionAttributeLocation, size, type, normalize, stride, offset);

  // provide texture coordinates for the rectangle.
  var texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0.0,  0.0,
      1.0,  0.0,
      0.0,  1.0,
      0.0,  1.0,
      1.0,  0.0,
      1.0,  1.0,
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(texCoordAttributeLocation);
  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      texCoordAttributeLocation, size, type, normalize, stride, offset);

  webglUtils.resizeCanvasToDisplaySize(gl.canvas);

  // Tell WebGL how to convert from clip space to pixels
  canvas.width = 768; 
  canvas.height = canvas.width*images[0].height/images[0].width;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Clear the canvas
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Tell it to use our program (pair of shaders)
  gl.useProgram(program);

  // Bind the attribute/buffer set we want.
  gl.bindVertexArray(vao);

  // Pass in the canvas resolution so we can convert from
  // pixels to clipspace in the shader
  //gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
  gl.uniform2f(resolutionLocation, images[0].width, images[0].height);

  var imageLocation = gl.getUniformLocation(program, "u_image");
  makeTexture(gl, images[0], 0);
  gl.uniform1i(imageLocation, 0);

  imageLocation = gl.getUniformLocation(program, "u_depth");
  makeTexture(gl, images[1], 1);
  gl.uniform1i(imageLocation, 1);

  // Bind the position buffer so gl.bufferData that will be called
  // in setRectangle puts data in the position buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Set a rectangle the same size as the image.
  setRectangle(gl, 0, 0, images[0].width, images[0].height);
}

function setRectangle(gl, x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     x1, y1,
     x2, y1,
     x1, y2,
     x1, y2,
     x2, y1,
     x2, y2,
  ]), gl.STATIC_DRAW);
}

function makeTexture(gl, image, index) {
  //console.log(gl.getParameter(gl.MAX_TEXTURE_SIZE));

  var texture = gl.createTexture();

  // make unit 0 the active texture uint
  gl.activeTexture(gl.TEXTURE0 + index);
  // Bind it to texture unit 0' 2D bind point
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the parameters so we don't need mips and so we're not filtering
  // and we don't repeat at the edges
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); 
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);


  // Upload the image into the texture.
  var mipLevel = 0;               // the largest mip

  var internalFormat = gl.RGBA;   // format we want in the texture

  var srcFormat = gl.RGBA;        // format of data we are supplying
  var srcType = gl.UNSIGNED_BYTE; // type of data we are supplying
  gl.texImage2D(gl.TEXTURE_2D, mipLevel, internalFormat, srcFormat, srcType, image);

  function renderLoop(timeStamp) 
  { 
    //console.log("render: ", timeStamp);
    var timeLocation = gl.getUniformLocation(program, "u_time"); 
     gl.uniform1f(timeLocation, timeStamp/1000.0);

     // Draw the rectangle.
     var primitiveType = gl.TRIANGLES;
     var offset = 0;
     var count = 6;
     gl.drawArrays(primitiveType, offset, count);

     window.requestAnimationFrame(renderLoop);
  }

  // start the loop
  window.requestAnimationFrame(renderLoop);
}


