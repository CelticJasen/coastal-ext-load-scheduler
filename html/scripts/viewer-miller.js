window.onload = async function(){
    await createTable("today", "outbnd", "Miller");
    await createTable("tomorrow", "outbnd", "Miller");
    await createTable("today", "inbnd", "Miller");
    await createTable("tomorrow", "inbnd", "Miller");
}