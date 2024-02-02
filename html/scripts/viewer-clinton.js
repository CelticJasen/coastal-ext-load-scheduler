window.onload = async function(){
    await createTable("today", "outbnd", "Clinton");
    await createTable("tomorrow", "outbnd", "Clinton");
    await createTable("today", "inbnd", "Clinton");
    await createTable("tomorrow", "inbnd", "Clinton");
}