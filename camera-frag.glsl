#version 300 es

precision mediump float;

uniform sampler2D u_image;
uniform sampler2D u_depth;
uniform float u_time;

in vec2 v_texCoord; // 0-1
out vec4 outColor;

// Consider two camera perspectives with the second farther from the subject and
// with a compensating increase in focal length. Render a point in the second
// perspective (d2, f2) by calculating how far on the image plane it has moved from first
// perspective and fetching what was at the original coordinate.
void main()
{
    vec2 coord = v_texCoord;
    float timeFrac = (sin(u_time*2.0)+1.0)/2.0; // cycle the effect over time

    // Camera configurations:
    float f1 = 32.0 / 1000.0; // Initial focal length
    float move = 0.5;  // Distance the camera moves away from the subject

    // Distance to the subject point (same in both perspectives)
    float depth = texture(u_depth, coord, 0.0).x;
    // Note: The texture sampler is normalizing our depth data, fix this.
    // Denormalize based on estimate.
    float minDepth = 0.5; // Estimated subject depth
    float maxDepth = 3.0; // Estimated background distance in m
    depth = depth * (maxDepth - minDepth) + minDepth;

    // camera distances
    float d1 = depth;
    float d2 = depth + move;

    // Time interpolate second camera position.
    d2 = d1 + (d2-d1) * timeFrac;

    // Choose a second focal length that preserves image size at a given depth.
    // logicaly we should preserve the size at the subject distance, but we get a lot of
    // tearing where there is not enough info.  If we instead preserve the size at max
    // distance we allow some shrinkage of the subject but get less tearing.
    float pd = 3.0; // depth at which to preserve size
    float f2 = (pd+move)/pd * f1;

    // Time interpolate second focal length.
    f2 = f1 + (f2-f1) * timeFrac;

    // The position being evaluated in perspective two converted from
    // normalized coordinates to an image centered radius vector.
    vec2 r2 = (coord - vec2(0.5)) * 2.0;

    // Find the corresponding position in perspective one.
    // r1 is in the same direction as r2 but lengthened by distance and focal length factors.
    float r1len = (d2 / d1) * (f1 / f2) * length(r2);
    vec2 r1 = normalize(r2) * r1len;

    // Back to normalized coordinates
    coord = r1/2.0 + vec2(0.5);

    // Return the position shifted texture color
    outColor = texture(u_image, coord, 0.0);

    // add offset in red
    //outColor += vec4(length(r2len-r1len)*10.0, 0.0, 0.0, 1.0);
    // show offset in red
    //outColor = vec4(length(offset)*10.0, 0.0, 0.0, 1.0);
}
