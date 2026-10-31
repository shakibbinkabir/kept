// The Keeper ring in 3D: an open torus with round caps and the gem in its gap,
// drawn by a small raymarching shader (no libraries). On load the gem orbits
// in and settles; the ring follows the pointer and turns as the page scrolls.
// Without WebGL, or with reduced motion, the flat mark stays in its place.
(function () {
  const canvas = document.getElementById("ring");
  const mark = document.querySelector(".stage-mark");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const fs = `precision highp float;
uniform vec2 uRes;uniform vec3 uRot;uniform float uGem;uniform float uTime;
const vec3 ICE=vec3(.733,.882,.980);const vec3 DEEP=vec3(.059,.298,.459);const vec3 SKY=vec3(.196,.510,.722);const vec3 INK=vec3(.106,.149,.173);
vec2 r2(vec2 v,float a){float c=cos(a),s=sin(a);return vec2(c*v.x-s*v.y,s*v.x+c*v.y);}
float capTorus(vec3 p,vec2 sc,float ra,float rb){p.x=abs(p.x);float k=(sc.y*p.x>sc.x*p.y)?dot(p.xy,sc):length(p.xy);return sqrt(dot(p,p)+ra*ra-2.*ra*k)-rb;}
vec3 gemPos(){float t=1.-uGem;float a=radians(40.)-t*5.2;float r=mix(1.,1.75,t*t);return vec3(cos(a)*r,sin(a)*r,t*1.4);}
vec3 obj(vec3 p){p.yz=r2(p.yz,-uRot.x);p.xz=r2(p.xz,-uRot.y);return p;}
vec2 map(vec3 p){p=obj(p);vec3 q=p;q.xy=r2(q.xy,radians(-130.));
float ring=capTorus(q,vec2(.6756,-.7373),1.,.257);float gem=length(p-gemPos())-.324;
return ring<gem?vec2(ring,1.):vec2(gem,2.);}
vec3 nrm(vec3 p){vec2 e=vec2(.0015,0.);return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));}
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/min(uRes.x,uRes.y)*1.55;
vec3 ro=vec3(0.,0.,4.3);vec3 rd=normalize(vec3(uv,-1.75));
float b=dot(ro,rd);float c=dot(ro,ro)-6.3;if(b*b-c<0.){gl_FragColor=vec4(0.);return;}
float t=0.;vec2 h=vec2(1.,0.);for(int i=0;i<72;i++){h=map(ro+rd*t);if(h.x<.001||t>8.)break;t+=h.x;}
if(h.x>.003){gl_FragColor=vec4(0.);return;}
vec3 p=ro+rd*t;vec3 n=nrm(p);vec3 l=normalize(vec3(-.55,.75,.65));vec3 l2=normalize(vec3(.7,-.4,.3));
float dif=max(dot(n,l),0.);float fill=max(dot(n,l2),0.)*.35;float fr=pow(1.-max(dot(n,-rd),0.),3.);
float spec=pow(max(dot(reflect(-l,n),-rd),0.),48.);
float ao=clamp(map(p+n*.12).x/.12,.0,1.);
vec3 base=h.y<1.5?mix(DEEP,ICE,smoothstep(.0,.85,dif+fill)):mix(DEEP,SKY,smoothstep(.0,.7,dif+fill*.6));
vec3 col=base*(.55+.45*ao)+ICE*spec*(h.y<1.5?.35:.6)+ICE*fr*.18;
col=mix(INK,col,.97);gl_FragColor=vec4(col,1.);}`;

  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, v);
  gl.attachShader(prog, f);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uRes = U("uRes"), uRot = U("uRot"), uGem = U("uGem"), uTime = U("uTime");

  mark?.classList.add("hidden");
  const state = { tx: 0, ty: 0, x: 0.18, y: -0.25, gem: still ? 1 : 0, start: performance.now(), visible: true, dirty: true };

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      state.dirty = true;
    }
  }
  addEventListener("resize", resize);
  resize();

  if (!still) {
    addEventListener("pointermove", (e) => {
      state.tx = (e.clientY / innerHeight - 0.5) * 0.5;
      state.ty = (e.clientX / innerWidth - 0.5) * 0.7;
    });
  }
  new IntersectionObserver(([e]) => (state.visible = e.isIntersecting)).observe(canvas);

  const ease = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
  function frame(now) {
    requestAnimationFrame(frame);
    if (!state.visible && !state.dirty) return;
    if (!still) {
      const scroll = scrollY / innerHeight;
      const tx = 0.18 + state.tx + Math.sin(now / 2600) * 0.05;
      const ty = -0.25 + state.ty + Math.sin(scroll * 0.9) * 0.55 + Math.sin(now / 3400) * 0.06;
      state.x += (tx - state.x) * 0.06;
      state.y += (ty - state.y) * 0.06;
      state.gem = ease((now - state.start - 300) / 1800);
    } else if (!state.dirty) return;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform3f(uRot, state.x, state.y, 0);
    gl.uniform1f(uGem, state.gem);
    gl.uniform1f(uTime, now / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    state.dirty = false;
  }
  requestAnimationFrame(frame);
})();
