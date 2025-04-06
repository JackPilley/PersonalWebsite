#version 300 es
precision mediump float;

#define MAX_DIST 100.0
#define MIN_DIST 0.0001

in vec2 vPosition;
in vec2 vScreenPos;

uniform vec2 resolution;
uniform float time;

layout(location = 0) out vec4 FragColor;

float sdfSphere(vec3 point, vec3 origin, float radius)
{
    return length(point - origin) - radius;
}

vec4 combine(vec4 a, vec4 b)
{
    if(a.w < b.w) 
        return a;
    else 
        return b;
}

// Get distance and colour for point
vec4 map(vec3 point)
{   
    vec3 p = point;

    p.xz = mod(p.xz, 1.0) - .5;
    p.y = abs(p.y);
    float d = -abs(point.y) + .5;
    d = max(d, -sdfSphere(p, vec3(0, .5, 0), .4));
    d = min(d, sdfSphere(p, vec3(0, .5, 0), .25));
    return vec4(1,1,1,d);
}

// Tetrahedron method from Inigo Quilez (who got it from Paulo Falcao)
vec3 calcNormalTetra(vec3 pos)
{
    const float h = MIN_DIST;
    const vec2 corners = vec2(1, -1);
    return normalize(corners.xyy * map(pos + corners.xyy*h).w +
                     corners.yyx * map(pos + corners.yyx*h).w + 
                     corners.yxy * map(pos + corners.yxy*h).w +
                     corners.xxx * map(pos + corners.xxx*h).w);
}

vec3 render(vec3 rayOrigin, vec3 rayDirection)
{
    vec3 colour = vec3(0);
    // Distance we've marched from the ray origin
    float rayProgress = 0.;
    vec4 mapping = vec4(1);
    vec3 rayPosition = rayOrigin;
    int i;
    for(i=0; i < 200; i++)
    {
        rayPosition = rayOrigin + rayDirection * rayProgress;
        rayPosition.y += sin(rayPosition.z/2.)/4.;
        
        mapping = map(rayPosition);

        rayProgress += mapping.w;
        
        if(mapping.w < MIN_DIST || rayProgress > MAX_DIST)
        {
            rayProgress = min(rayProgress, MAX_DIST);
            break;
        }
    }

    if(mapping.w < MIN_DIST)
    {
        colour = vec3(1. - float(i)/200.);
    }
    else
    {
        colour = vec3(0.0, 0.0, 0.0);
    }

    colour = mix(colour, vec3(0.0, 0.0, 0.0), min(max(vec3(rayProgress/15.), vec3(0)), vec3(1)));

    return colour;
}

void main() {
    vec2 aspectPos = vec2(vPosition.x * (resolution.x/resolution.y), vPosition.y);
    
    vec3 cameraPos = vec3(0,-sin(time/2.)/4.,8.0-time);
    vec3 cameraFocus = vec3(sin(time/5.)*3.,sin(time/3. + 1.),-time - 1.);

    // Build camera matrix (typical lookAt matrix)
    vec3 cameraForward = normalize(cameraFocus - cameraPos);
    vec3 cameraRight = normalize(cross(cameraForward, vec3(0, 1, 0)));
    vec3 cameraUp = normalize(cross(cameraRight, cameraForward));
    mat3 cameraMat = mat3(cameraRight, cameraUp, cameraForward);

    vec3 rayDirection = cameraMat * normalize(vec3(aspectPos/2., 1));

    FragColor = vec4(
        render(cameraPos, rayDirection),
        1.0);
}
