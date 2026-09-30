// Replicate the broker generator and measure its correlation structure across many seeds,
// against the closed-form one-factor prediction rho_ij = b_i b_j sm^2 / (s_i s_j).
const MKT_DRIFT = 0.00032, MKT_VOL = 0.0082, DAYS = 320, WINDOW = 120;
const U = [
  ["HALC",1.40,0.0150],["NORB",1.25,0.0080],["MRDN",1.05,0.0070],
  ["ATLS",0.85,0.0165],["CRWN",0.55,0.0055],["VRDT",0.40,0.0048],
];
function rng(seed){let a=(seed|0)||1;return function(){a|=0;a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
function gauss(r){let u=0,v=0;while(u===0)u=r();while(v===0)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function build(seed){
  const r=rng(seed); const regime=[]; let v=1;
  for(let i=0;i<DAYS;i++){ if(r()<0.02) v=0.65+r()*2.0; regime.push(v); }
  const factor=[]; for(let t=0;t<DAYS;t++) factor.push(MKT_DRIFT+gauss(r)*MKT_VOL*regime[t]);
  const series={};
  for(const [id,beta,idio] of U){
    const ri=rng(seed+id.charCodeAt(0)*7919+id.charCodeAt(1)*104729);
    const p=[100];
    for(let t=1;t<DAYS;t++) p.push(p[t-1]*(1+beta*factor[t]+gauss(ri)*idio*regime[t]));
    series[id]=p;
  }
  return series;
}
function corrAt(series, to){
  const R=U.map(([id])=>{const a=[];for(let t=Math.max(1,to-WINDOW+1);t<=to;t++)a.push(Math.log(series[id][t]/series[id][t-1]));return a;});
  const n=R[0].length, mu=R.map(x=>x.reduce((a,b)=>a+b,0)/n);
  const cov=(a,b)=>{let s=0;for(let t=0;t<n;t++)s+=(R[a][t]-mu[a])*(R[b][t]-mu[b]);return s/(n-1);};
  const sd=U.map((_,a)=>Math.sqrt(cov(a,a)));
  return U.map((_,a)=>U.map((__,b)=>cov(a,b)/(sd[a]*sd[b])));
}
// closed form
const sm=MKT_VOL;
const sig=U.map(([,b,i])=>Math.sqrt(b*b*sm*sm+i*i));
console.log("theoretical rho:");
for(let a=0;a<6;a++){let row="  "+U[a][0]+" ";for(let b=0;b<6;b++){row+=(a===b?1:(U[a][1]*U[b][1]*sm*sm)/(sig[a]*sig[b])).toFixed(2).padStart(6);}console.log(row);}

let all=[], mins=[], negs=0, belowMean=0, N=400;
for(let s=1;s<=N;s++){
  const M=corrAt(build(s*37+11), Number(process.argv[2]||DAYS-1));
  const off=[];
  for(let a=0;a<6;a++)for(let b=0;b<6;b++) if(a!==b) off.push(M[a][b]);
  const mean=off.reduce((x,y)=>x+y,0)/off.length;
  all.push(mean); mins.push(Math.min(...off));
  negs += off.filter(x=>x<=0.05).length;
  if(mean<0.10) belowMean++;
}
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
all.sort((a,b)=>a-b); mins.sort((a,b)=>a-b);
console.log("\nover", N, "seeds, measured at day "+(process.argv[2]||DAYS-1)+":");
console.log("  mean off-diagonal rho: avg", avg(all).toFixed(3), " p5", all[Math.floor(N*0.05)].toFixed(3), " min", all[0].toFixed(3));
console.log("  lowest pair per market: avg", avg(mins).toFixed(3), " p5", mins[Math.floor(N*0.05)].toFixed(3), " min", mins[0].toFixed(3));
console.log("  pairs <= 0.05:", (negs/(N*30)*100).toFixed(1)+"% of all pairs");
console.log("  markets whose MEAN rho < 0.10:", belowMean, "of", N);
