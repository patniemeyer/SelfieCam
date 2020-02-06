#version 300 es

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


