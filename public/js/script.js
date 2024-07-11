$(document).ready(function(){let yearNow=new Date().getFullYear()
  $('#year').text(yearNow)
  const $items=$('.page');const $itUnderline=$('.itUnderline')
  function checkVisibility(){$items.each(function(){const $this=$(this);const offsetTop=$this.offset().top;const scrollTop=$(window).scrollTop();const windowHeight=$(window).height();if(offsetTop<scrollTop+windowHeight-50){$this.addClass('show');$itUnderline.addClass('underlinedIT')}})}
  $(window).on('scroll',checkVisibility);checkVisibility()
  $(window).scroll(function(){if($(this).scrollTop()>100){$('#scrollToTopBtn').fadeIn()}else{$('#scrollToTopBtn').fadeOut()}})
  $('#scrollToTopBtn').click(function(){$('html, body').animate({scrollTop:0},10)
  return!1})})
  var message=$('#message').text();var numberMessage=$('#numberMessage').text();if(message.length>3){alert(message)}
  if(numberMessage.length>3){alert(numberMessage)}