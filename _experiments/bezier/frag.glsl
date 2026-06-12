#version 300 es
precision mediump float;

#define PI 3.14159265358979323846

in vec2 vPosition;
in vec2 vScreenPos;

uniform vec2 resolution;
uniform float time;
uniform vec3 clock;

layout(location = 0) out vec4 FragColor;

float lineSDF(vec2 p, vec2 A, vec2 B)
{
    p = p - A;
    B = B - A;

    float s = dot(p,B)/dot(B,B);

    return length(p - B * clamp(s, 0., 1.));
}

float bezierSDF(vec2 p, vec2 A, vec2 B, vec2 C)
{
    vec2 M = A - (2.0 * B) + C;
    vec2 N = (-2.0 * A) + (2.0 * B);

    float a = dot(-2.0 * M, M);

    // If 'a' is zero (or close enough to it), then we have a straight line. We have to handle that
    // differently, otherwise we'll get a division by zero
    if(abs(a) < 0.0001)
    {
        return lineSDF(p, A, C);
    }

    float b = -dot(N, M) - dot(2.0 * M, N);

    float c = dot(2.0 * M, p) - dot(N, N) - dot(2.0 * M, A);

    float d = dot(N, p) - dot(N, A);

    float m = (3.0 * a * c - b * b) / (3.0 * a * a);
    float n = (2.0 * b * b * b - 9.0 * a * b * c + 27.0 * a * a * d) / (27.0 * a * a * a);

    float dis = (n*n)/4. + (m*m*m)/27.;
    float adj = b/(3.*a);

    if(dis > 0.)
    {
        float s = sqrt(dis);
        float u1 = -n/2. + s;
        float u2 = -n/2. - s;
        float t = sign(u1)*pow(abs(u1), 1./3.) + sign(u2)*pow(abs(u2), 1./3.) - adj;
        t = clamp(t, 0., 1.);
        return distance(p, M*t*t + N*t + A);
    }
    else
    {
        //float ac = acos(((3.*n)/(2.*m)) * sqrt(-m/3.));
        float ac = acos(-n/(2.*sqrt(-m*m*m/27.)));

        float s = 2. * sqrt(-m/3.);
        float r1 = clamp(s * cos(ac/3.) - adj, 0., 1.);
        float r2 = clamp(s * cos((ac - 2.*PI)/3.) - adj, 0., 1.);
        float r3 = clamp(s * cos((ac - 4.*PI)/3.) - adj, 0., 1.);

        vec2 l1 = p - (M*r1*r1 + N*r1 + A);
        vec2 l2 = p - (M*r2*r2 + N*r2 + A);
        vec2 l3 = p - (M*r3*r3 + N*r3 + A);

        return sqrt(min(min(dot(l1,l1), dot(l2,l2)), dot(l3,l3)));
    }
}

void main()
{
    float pixelSize = 1./resolution.y;
    float aspectRatio = resolution.x/resolution.y;
    vec2 aspectPos = vec2(vPosition.x * aspectRatio, vPosition.y);
    if(aspectRatio < 1.) aspectPos = vec2(vPosition.x, vPosition.y/aspectRatio);
    
    //float dist = bezierSDF(aspectPos, vec2(-0.5, 0), vec2(0, 0.5), vec2(cos(time)*0.5, .5));
    //float dist = 1.;
    vec2 secondHand = vec2(sin(PI * 2. * clock.z/60.), cos(PI * 2. * clock.z/60.)) * 0.9;
    vec2 minuteHand = vec2(sin(PI * 2. * clock.y/60.), cos(PI * 2. * clock.y/60.)) * 0.8;
    vec2 hourHand = vec2(sin(PI * 2. * clock.x/12.), cos(PI * 2. * clock.x/12.)) * 0.5;
    float dist = bezierSDF(aspectPos, secondHand, vec2(0, 0.0), minuteHand);
    dist = min(dist, bezierSDF(aspectPos, minuteHand, vec2(0, 0.0), hourHand) - 0.005);
    vec2 absAsp = abs(aspectPos);

    vec2 pip = vec2(0., 0.95);
    mat2 rot;
    rot[0] = vec2(0.866025404, 0.5);
    rot[1] = vec2(-0.5, 0.866025404);

    for(float i = 0.; i < 4.; ++i) {
        dist = min(dist, lineSDF(absAsp, pip, pip * 0.9));
        pip *= rot;
    }

    dist = smoothstep(0.005, 0.005 + pixelSize*2., dist);
    FragColor = vec4(dist, dist, dist ,1.);
}
