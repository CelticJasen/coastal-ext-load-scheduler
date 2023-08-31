window.onload = async function(){
    await createTable("today", "outbnd", "Willow");
    await createTable("tomorrow", "outbnd", "Willow");
    await createTable("today", "inbnd", "Willow");
    await createTable("tomorrow", "inbnd", "Willow");
}