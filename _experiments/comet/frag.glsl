#version 300 es
precision mediump float;

// This exponent in a float gives numbers in the range of [1.0, 2.0)
#define EXPONENT 0x3F800000
// Mask of the mantissa of a float
#define MASK 0x007FFFFF

#define PI 3.14159265358979323846

in vec2 vPosition;
in vec2 vScreenPos;

uniform vec2 resolution;
uniform float time;

layout(location = 0) out vec4 FragColor;

ivec3 hash(ivec3 h)
{
    int a = h.x ^ 0x0fe382ac;
    int b = h.y ^ 0x7862c765;
    int c = h.z ^ 0xe63cf826;

    a ^= a << 3;
    a += a >> 5;
    a ^= a << 7;
    a += a >> 11;
    a ^= a << 13;
    a += a >> 17;
    a ^= a << 5;

    // Sponge, sort of
    b ^= a;
    b += b >> 2;
    b ^= b << 4;
    b += b >> 6;
    b ^= b << 12;
    b += b >> 20;
    b ^= b << 13;
    b += b >> 5;
    b ^= b << 9;

    c ^= b;
    c += c >> 1;
    c ^= c << 3;
    c += c >> 8;
    c ^= c << 14;
    c += c >> 23;
    c ^= c << 11;
    c += c >> 6;
    c ^= c << 2;

    return ivec3(a,b,c);
}

float noise(vec3 seed)
{
    ivec3 h = hash(floatBitsToInt(seed));

    float result = intBitsToFloat((MASK & (h.x ^ h.y ^ h.z)) | EXPONENT);

    return result-1.0;
}

float circleSDF(vec2 point, vec2 origin, float radius)
{
    return length(point - origin) - radius;
}

float cometVal(vec2 pos)
{
    float pixelSize = 1./resolution.y;
    float dist = circleSDF(pos, vec2(0.), 0.);

    float val = 0.;
    float combinedDist = 0.;

    float angle = atan(pos.y, pos.x);

    for(float i = 1.; i < 5.; i += 1.)
    {
        float a = cos(angle + i + time*2.)/2. + 0.5;
        a *= a * a;
        float distortedDist = dist - 
            (a * cos(angle * 30. - time*3.))
            /50. - i/40.;

        float outer = smoothstep(0.3 + 3.*pixelSize, 0.3, distortedDist);
        float inner = smoothstep(0.295 + 3.*pixelSize, 0.295, distortedDist);

        val = max(val, outer - inner);
        combinedDist = max(combinedDist, distortedDist);
    }

    vec2 starPos = vScreenPos;

    float threshold = 0.995;
    mat2 rot30 = mat2(0.8660254037844, -0.5, 0.5, 0.8660254037844);
    vec2 rpos = pos * rot30;

    if(rpos.y > 0. && abs(rpos.x) < rpos.y / 3. + 0.3)
    {
        float ax = abs(rpos.x);
        threshold = sqrt(1. - ax);
        starPos += rot30[1] * -time * 150.;
    }

    float noiseA = noise(vec3(floor(starPos / 2.), -1.));
    float timeSlice = floor(time/4. + noiseA);
    float sliceProgress = fract(time/4. + noiseA);
    float noiseB = noise(vec3(floor(starPos / 2.), timeSlice));

    float starfield = step(threshold, noiseB);
    starfield *= cos(sliceProgress * PI * 2. + PI) / 0.5 + 0.5;
    starfield = starfield * step(0.3, combinedDist);

    val = max(val, starfield);

    return val;
}

void main()
{
    float pixelSize = 1./resolution.y;
    float aspectRatio = resolution.x/resolution.y;
    vec2 aspectPos = vec2(vPosition.x * aspectRatio, vPosition.y);

    float val = circleSDF(aspectPos, vec2(0., -3.5),3.);

    float outer = smoothstep(0.3 + 3.*pixelSize, 0.3, val);
    float inner = smoothstep(0.28, 0.28 + 3.*pixelSize, val);

    val = outer * inner;

    float comet = cometVal(aspectPos);

    val = max(outer, comet);
    val *= inner;

    FragColor = vec4(vec3(val), 1.);
}
